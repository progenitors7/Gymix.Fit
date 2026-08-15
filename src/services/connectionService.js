import { supabase } from '../lib/supabaseClient'
import { createMember } from './memberService'
import { unifiedService } from './unifiedService'
import { pushNotificationService } from './pushNotificationService'

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
          avatar_url,
          phone_number,
          gender
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

    // BUG #15 FIX: .maybeSingle() throws PGRST116 if a member has multiple rows
    // (e.g. pending requests to multiple gyms). Use limit(1) + array destructure instead.
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
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error
    return (data && data.length > 0) ? data[0] : null
  },

  /**
   * Submit a new connection request using gym code.
   */
  async sendConnectionRequest(gymCode, profileId) {
    if (!gymCode || !profileId) throw new Error('Gym Code and Profile ID are required')

    // 1. Resolve gym by unique code
    const { data: gym, error: gymError } = await supabase
      .from('gyms')
      .select('id, gym_name, owner_user_id')
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

    // Trigger instant push notification to Gym Owner
    if (gym?.owner_user_id) {
      pushNotificationService.notifyNewConnectionRequest(gym.id, gym.owner_user_id, 'A new athlete').catch(() => {})
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

    const getStatusFromExpiry = (expiryDate) => {
      if (!expiryDate) return 'active'
      const today = new Date(new Date().toISOString().split('T')[0])
      const expiry = new Date(expiryDate)
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) return 'expired'
      if (daysLeft <= 7) return 'expiring_soon'
      return 'active'
    }

    // Create the member payload
    const memberPayload = {
      gym_id,
      profile_id,
      avatar_url: memberData.avatar_url || profiles?.avatar_url || null,
      full_name: memberData.full_name || profiles?.full_name || 'Member',
      phone_number: memberData.phone_number || profiles?.phone_number || null,
      gender: memberData.gender || profiles?.gender || null,
      membership_plan: memberData.membership_plan,
      join_date: memberData.join_date || new Date().toISOString().split('T')[0],
      expiry_date: memberData.expiry_date,
      status: getStatusFromExpiry(memberData.expiry_date),
      notes: memberData.notes || 'Self-onboarded via connection code'
    }

    // Check if an existing member record exists in this gym to prevent duplicates
    let existingMember = null
    const targetPhone = memberPayload.phone_number?.trim()
    const targetName = memberPayload.full_name?.trim()

    // 1. Try to find by profile_id first (most direct match)
    if (profile_id) {
      const { data: matchProfile, error: profileErr } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', gym_id)
        .eq('profile_id', profile_id)
        .maybeSingle()

      if (!profileErr && matchProfile) {
        existingMember = matchProfile
      }
    }

    // 2. Fetch all members in this gym to check for cleaned phone number or case-insensitive name match
    if (!existingMember) {
      const { data: allMembers, error: membersErr } = await supabase
        .from('members')
        .select('*')
        .eq('gym_id', gym_id)

      if (!membersErr && allMembers) {
        const cleanNumber = (phone) => phone ? phone.replace(/\D/g, '') : ''
        const cleanTargetPhone = cleanNumber(targetPhone)
        const last10Target = cleanTargetPhone.slice(-10)

        // Try phone matching first (last 10 digits match, and not linked to another user)
        if (last10Target.length === 10) {
          existingMember = allMembers.find(m => {
            const cleanM = cleanNumber(m.phone_number)
            return cleanM.slice(-10) === last10Target && (!m.profile_id || m.profile_id === profile_id)
          })
        }

        // If no phone match, try case-insensitive name match (not linked to another user)
        if (!existingMember && targetName) {
          const normalizedTargetName = targetName.trim().toLowerCase()
          existingMember = allMembers.find(m => {
            return m.full_name && 
                   m.full_name.trim().toLowerCase() === normalizedTargetName && 
                   (!m.profile_id || m.profile_id === profile_id)
          })
        }
      }
    }

    let newMember
    if (existingMember) {
      // Reactivate/update existing member
      const { data, error: updateErr } = await supabase
        .from('members')
        .update({
          profile_id,
          avatar_url: memberPayload.avatar_url || existingMember.avatar_url,
          full_name: memberPayload.full_name || existingMember.full_name,
          phone_number: memberPayload.phone_number || existingMember.phone_number,
          gender: memberPayload.gender || existingMember.gender,
          membership_plan: memberPayload.membership_plan,
          expiry_date: memberPayload.expiry_date,
          status: memberPayload.status,
          left_at: null, // Clear left_at timestamp on rejoin to stop 30-day auto-purge
          notes: memberPayload.notes || existingMember.notes || 'Reconnected profile — data restored'
        })
        .eq('id', existingMember.id)
        .select(`
          id, gym_id, profile_id, avatar_url, full_name, phone_number, gender,
          join_date, membership_plan, expiry_date, status, notes, biometric_user_id, left_at, created_at
        `)
        .single()

      if (updateErr) throw updateErr
      newMember = data
    } else {
      // 1. Create new member in DB
      newMember = await createMember(memberPayload)
    }

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

    // Trigger instant push notification to Approved Member
    if (profile_id) {
      pushNotificationService.notifyConnectionApproved(gym_id, profile_id, '').catch(() => {})
    }

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
   * Core logic to check-in or check-out a member and award loyalty coins.
   * Shared by secure QR scanning, static QR scanning, and manual dashboard entries.
   */
  async logMemberAttendanceDirect(gymId, memberId) {
    // 1. Retrieve member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, full_name, expiry_date, status, membership_plan')
      .eq('id', memberId)
      .eq('gym_id', gymId)
      .maybeSingle()

    if (memberError) throw memberError
    if (!member) throw new Error('Athlete profile not found! ❌')

    // 2. Membership status checks
    const todayStr = new Date().toISOString().split('T')[0]
    if (member.status === 'left') {
      throw new Error(`Athlete has disconnected/left the gym! (${member.full_name}) ❌`)
    }
    if (member.status === 'expired' || (member.expiry_date && member.expiry_date < todayStr)) {
      throw new Error(`Membership is Expired! (${member.full_name}) ❌`)
    }

    // 3. Check if the member has any check-in record today to enforce daily limits and cooldowns
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch the absolute last attendance log for today (whether checked out or not)
    const { data: lastRecord, error: checkInError } = await supabase
      .from('attendance')
      .select('id, check_in_time, check_out_time')
      .eq('member_id', memberId)
      .eq('gym_id', gymId)
      .gte('check_in_time', startOfDay.toISOString())
      .lte('check_in_time', endOfDay.toISOString())
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (checkInError) throw checkInError

    if (lastRecord) {
      // Case A: If they already checked out today, block any further action
      if (lastRecord.check_out_time) {
        throw new Error('Attendance already completed for today! Max 1 check-in/out per day. ⚠️')
      }

      // Case B: If they are checked in, enforce a 5-minute cooldown before checking out
      const checkInTime = new Date(lastRecord.check_in_time)
      const diffMins = (new Date() - checkInTime) / 60000
      if (diffMins < 5) {
        throw new Error('Already checked in! Please wait 5 minutes before checking out to avoid accidental duplicate scans. ⚠️')
      }

      // Perform check-out
      const { data: attendance, error: updateError } = await supabase
        .from('attendance')
        .update({
          check_out_time: new Date().toISOString()
        })
        .eq('id', lastRecord.id)
        .select()
        .single()

      if (updateError) throw updateError

      return {
        success: true,
        action: 'checkout',
        member,
        attendance
      }
    }

    // 4b. Perform check-in (insert a new attendance record since no record exists today yet)
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

      // Automatic Loyalty Coins Reward Logic
      try {
        const { data: gymConfig } = await supabase
          .from('gyms')
          .select('enable_gym_coins, coin_reward_per_checkin, coin_reward_per_streak_milestone')
          .eq('id', gymId)
          .maybeSingle();

        if (gymConfig?.enable_gym_coins) {
          const rewardCoins = gymConfig.coin_reward_per_checkin || 10;
          
          // Get recent check-ins to compute streak (including current check-in)
          const { data: logs } = await supabase
            .from('attendance')
            .select('check_in_time')
            .eq('member_id', memberId)
            .eq('gym_id', gymId)
            .order('check_in_time', { ascending: false });

          const allLogs = [{ check_in_time: attendance.check_in_time }, ...(logs || [])];

          // Helper: format a Date object to local YYYY-MM-DD string
          const getLocalDateStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dateVal = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dateVal}`;
          };

          const checkInDates = new Set(
            allLogs.map(log => getLocalDateStr(new Date(log.check_in_time)))
          );

          // BUG #8 FIX: The original code had a redundant first while-loop that was
          // effectively dead code (today always has a check-in since we just inserted it).
          // Removed it. The streak is now counted directly from today going backward,
          // correctly skipping Sundays (rest days) without breaking the streak.
          let streak = 0;
          let checkDate = new Date();
          checkDate.setHours(0, 0, 0, 0);

          while (true) {
            const dateStr = getLocalDateStr(checkDate);
            const hasCheckedIn = checkInDates.has(dateStr);
            const isSunday = checkDate.getDay() === 0;

            if (hasCheckedIn) {
              // Counted a day with a check-in, go further back
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else if (isSunday) {
              // Sundays are rest days — skip without breaking the streak
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              // Missed a non-Sunday day — streak is broken
              break;
            }
          }

          // Check streak milestones
          let bonusCoins = 0;
          let isMilestone = false;
          if (streak === 3 || streak === 7 || streak === 15 || streak === 30) {
            bonusCoins = gymConfig.coin_reward_per_streak_milestone || 50;
            isMilestone = true;
          }

          const totalAwarded = rewardCoins + bonusCoins;

          // Update member balance atomically to prevent race conditions
          const { error: rpcError } = await supabase
            .rpc('increment_member_coins', { 
              member_id: memberId, 
              coins_to_add: totalAwarded 
            });

          if (rpcError) throw rpcError;

          // Log transaction for Check-In
          await supabase
            .from('member_coins_transactions')
            .insert({
              member_id: memberId,
              amount: rewardCoins,
              reason: 'Daily Check-In Reward'
            });

          // Log transaction for Milestone
          if (isMilestone && bonusCoins > 0) {
            await supabase
              .from('member_coins_transactions')
              .insert({
                member_id: memberId,
                amount: bonusCoins,
                reason: `${streak}-Day Streak Milestone! 🔥`
              });
          }
        }
      } catch (coinErr) {
        console.error('[connectionService] Error awarding loyalty coins:', coinErr);
      }

      // Trigger instant push notification to Athlete
      if (member?.profile_id) {
        pushNotificationService.notifyCheckIn(gymId, member).catch(() => {})
      }

      return {
        success: true,
        action: 'checkin',
        member,
        attendance
      }
  },

  /**
   * Log Attendance Check-In via scanned QR Token.
   * Performs dynamic validation checks (screenshot rolling check, expiration, duplicate check-in).
   */
  async logAttendanceCheckIn(gymId, qrToken) {
    if (!gymId) throw new Error('Gym ID is required')
    if (!qrToken) throw new Error('No QR token received')

    // Parse token: MEM_SECURE_memberId_gymId_timestamp
    const parts = qrToken.split('_')
    if (parts.length < 5 || parts[0] !== 'MEM' || parts[1] !== 'SECURE') {
      throw new Error('Invalid QR Code format! ❌')
    }

    const memberId = parts[2]
    const tokenGymId = parts[3]
    const timestamp = parseInt(parts[4], 10)

    if (tokenGymId !== gymId) {
      throw new Error('Unauthorized Gym Connection! ❌')
    }

    // Screenshot/Rolling check (Maximum 60s skew allowance)
    const currentTime = Math.floor(Date.now() / 1000)
    const timeDiff = Math.abs(currentTime - timestamp)
    if (timeDiff > 60) {
      throw new Error('QR Code expired! Screenshots are not allowed. ❌')
    }

    return this.logMemberAttendanceDirect(gymId, memberId)
  },

  /**
   * Logs a manual check-in or check-out directly from the receptionist console.
   */
  async logManualAttendance(gymId, memberId) {
    if (!gymId) throw new Error('Gym ID is required')
    if (!memberId) throw new Error('Member ID is required')

    return this.logMemberAttendanceDirect(gymId, memberId)
  }
}
