import { supabase } from '../lib/supabaseClient'
import { createMember } from './memberService'
import { unifiedService } from './unifiedService'

export const connectionService = {
  /**
   * Fetch all pending connection requests for a gym.
   * Includes profile data using inner join/relationship query.
   */
  async getConnectionRequests(gymId) {
    if (!gymId) throw new Error('Gym ID is required')
    
    const { data, error } = await supabase
      .from('connection_requests')
      .select(`
        id,
        gym_id,
        profile_id,
        status,
        created_at,
        profiles (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('gym_id', gymId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Check connection status of a user profile.
   * Returns connection request along with gym details if exists.
   */
  async getConnectionStatus(profileId) {
    if (!profileId) throw new Error('Profile ID is required')

    const { data, error } = await supabase
      .from('connection_requests')
      .select(`
        id,
        gym_id,
        profile_id,
        status,
        gyms (
          id,
          gym_name,
          unique_code
        )
      `)
      .eq('profile_id', profileId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  /**
   * Submit a new connection request using gym code.
   */
  async sendConnectionRequest(gymCode, profileId) {
    if (!gymCode || !profileId) throw new Error('Gym Code and Profile ID are required')

    // 1. Resolve gym by unique code
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id, gym_name')
      .eq('unique_code', gymCode.trim().toUpperCase())
      .maybeSingle()

    if (gymError) throw gymError
    if (!gym) throw new Error('Gym code is incorrect or does not exist.')

    // 2. Insert connection request
    const { data, error } = await supabase
      .from('connection_requests')
      .insert({
        gym_id: gym.id,
        profile_id: profileId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new Error('A connection request for this gym is already active or pending.')
      }
      throw error
    }

    return { request: data, gym }
  },

  /**
   * Cancel/Delete connection request (member side).
   */
  async cancelConnectionRequest(requestId) {
    if (!requestId) throw new Error('Request ID is required')

    const { error } = await supabase
      .from('connection_requests')
      .delete()
      .eq('id', requestId)

    if (error) throw error
    return true
  },

  /**
   * Approve connection request.
   * This executes the hybrid onboarding transaction:
   * 1. Creates the member record using profile details, linking profile_id.
   * 2. Sets up subscription and payments.
   * 3. Deletes or updates the connection request status.
   */
  async approveConnectionRequest(request, memberData, paymentData) {
    if (!request || !request.id) throw new Error('Invalid request object')

    const { gym_id, profile_id, profiles } = request
    if (!gym_id || !profile_id) throw new Error('Request must contain gym_id and profile_id')

    // Create the member payload
    const memberPayload = {
      gym_id,
      profile_id,
      full_name: memberData.full_name || profiles?.full_name || 'Member',
      phone_number: memberData.phone_number || null,
      gender: memberData.gender || null,
      membership_plan: memberData.membership_plan,
      join_date: memberData.join_date || new Date().toISOString().split('T')[0],
      expiry_date: memberData.expiry_date,
      notes: memberData.notes || 'Self-onboarded via connection code'
    }

    // 1. Create the member in DB
    const newMember = await createMember(memberPayload)

    // 2. Setup subscription & payments using smartRenew
    if (newMember) {
      if (memberData.recordPayment && memberData.amountPaid > 0) {
        await unifiedService.smartRenew(
          gym_id,
          newMember.id,
          {
            plan_name: newMember.membership_plan,
            duration_type: 'custom',
            amount: parseFloat(memberData.amountPaid),
            expiry_date: newMember.expiry_date,
            gym_id
          },
          {
            amount_paid: parseFloat(memberData.amountPaid),
            payment_method: paymentData?.payment_method || 'cash',
            payment_status: 'paid',
            notes: paymentData?.notes || 'Initial approval subscription payment'
          }
        )
      } else {
        await unifiedService.recordInitialMemberSetup(gym_id, newMember)
      }
    }

    // 3. Mark the request as approved or delete it
    // Deleting keeps the pending queue clear and avoids redundant records.
    const { error } = await supabase
      .from('connection_requests')
      .delete()
      .eq('id', request.id)

    if (error) throw error

    return newMember
  },

  /**
   * Reject/Delete connection request (owner side).
   */
  async rejectConnectionRequest(requestId) {
    if (!requestId) throw new Error('Request ID is required')

    const { error } = await supabase
      .from('connection_requests')
      .delete()
      .eq('id', requestId)

    if (error) throw error
    return true
  },

  /**
   * Log Attendance Check-In via scanned QR Token.
   * Performs dynamic validation checks (screenshot rolling check, expiration, duplicate check-in).
   */
  async logAttendanceCheckIn(gymId, qrToken) {
    if (!gymId) throw new Error('Gym ID is required')
    if (!qrToken) throw new Error('No QR token received')

    // 1. Parse token: MEM_SECURE_memberId_gymId_timestamp
    const parts = qrToken.split('_')
    if (parts.length < 5 || parts[0] !== 'MEM' || parts[1] !== 'SECURE') {
      throw new Error('Invalid QR Code format! ❌')
    }

    const memberId = parts[2]
    const tokenGymId = parts[3]
    const timestamp = parseInt(parts[4], 10)

    // 2. Gym validation
    if (tokenGymId !== gymId) {
      throw new Error('Unauthorized Gym Connection! ❌')
    }

    // 3. Screenshot/Rolling check (Maximum 60s skew allowance)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(currentTime - timestamp)
    if (timeDiff > 60) {
      throw new Error('QR Code expired! Screenshots are not allowed. ❌')
    }

    // 4. Retrieve member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, expiry_date, status, membership_plan')
      .eq('id', memberId)
      .eq('gym_id', gymId)
      .maybeSingle()

    if (memberError) throw memberError
    if (!member) throw new Error('Athlete profile not found! ❌')

    // 5. Membership status checks
    const todayStr = new Date().toISOString().split('T')[0]
    if (member.status === 'expired' || (member.expiry_date && member.expiry_date < todayStr)) {
      throw new Error(`Membership is Expired! (${member.full_name}) ❌`)
    }

    // 6. Check if the member has an active check-in record today (where check_in_time is today, check_out_time is null)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const { data: activeSession, error: checkInError } = await supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .gte('check_in_time', startOfDay.toISOString())
      .lte('check_in_time', endOfDay.toISOString())
      .is('check_out_time', null)
      .maybeSingle()

    if (checkInError) throw checkInError

    if (activeSession) {
      // 7a. Active check-in today without checkout found, set check_out_time = now()
      const { data: attendance, error: updateError } = await supabase
        .from('attendance')
        .update({
          check_out_time: new Date().toISOString()
        })
        .eq('id', activeSession.id)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        action: 'checkout',
        member,
        attendance
      }
    } else {
      // 7b. Perform check-in (insert a new attendance record)
      const { data: attendance, error: insertError } = await supabase
        .from('attendance')
        .insert({
          gym_id: gymId,
          member_id: memberId,
          check_in_time: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError

      return {
        success: true,
        action: 'checkin',
        member,
        attendance
      }
    }
  }
}
