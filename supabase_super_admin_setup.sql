-- =========================================================================
-- Gymix Platform: Super Admin Setup & SaaS Subscriptions RLS Fix
-- (Successfully applied via Supabase MCP directly to project lgmlktuupnogsvacdnam)
-- =========================================================================

-- 1. Upgrade profiles role check constraint to support 'super_admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'member'::text, 'super_admin'::text]));

-- 2. Update trigger function to prevent reverting Super Admin to 'owner'
CREATE OR REPLACE FUNCTION public.enforce_gym_owner_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.email = 'scn1155@gmail.com' OR NEW.role = 'super_admin' THEN
    NEW.role := 'super_admin';
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.gyms WHERE owner_user_id = NEW.id) THEN
    NEW.role := 'owner';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Lock scn1155@gmail.com as super_admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'scn1155@gmail.com';

-- 4. Ensure RLS is enabled on saas_subscriptions
ALTER TABLE saas_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Upgrade is_super_admin() function
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN true;
  END IF;
  RETURN COALESCE(
    (auth.jwt() ->> 'email') IN ('scn1155@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND (role = 'super_admin' OR email = 'scn1155@gmail.com')
    ), 
    false
  );
END;
$function$;

-- 6. Add INSERT & UPDATE policies on saas_subscriptions for super admin
DROP POLICY IF EXISTS "Super admins can insert subscriptions" ON saas_subscriptions;
CREATE POLICY "Super admins can insert subscriptions"
ON saas_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
);

DROP POLICY IF EXISTS "Super admins can update subscriptions" ON saas_subscriptions;
CREATE POLICY "Super admins can update subscriptions"
ON saas_subscriptions
FOR UPDATE
TO authenticated
USING (
  is_super_admin()
)
WITH CHECK (
  is_super_admin()
);

-- 7. Atomic RPC procedure for Super Admin gym activations
CREATE OR REPLACE FUNCTION activate_gym_subscription_by_admin(
  target_gym_id UUID,
  target_plan_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_num_months INT DEFAULT 1,
  paid_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only platform Super Admin can execute this procedure.';
  END IF;

  -- 1. Update Gym status and plan
  UPDATE gyms
  SET status = 'active',
      saas_plan_id = target_plan_id
  WHERE id = target_gym_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gym with ID % not found.', target_gym_id;
  END IF;

  -- 2. Mark previous active subscriptions as expired
  UPDATE saas_subscriptions
  SET status = 'expired'
  WHERE gym_id = target_gym_id 
    AND status = 'active'
    AND current_period_end < end_date;

  -- 3. Insert new active subscription
  INSERT INTO saas_subscriptions (
    gym_id,
    plan_id,
    status,
    amount,
    currency,
    payment_status,
    current_period_start,
    current_period_end,
    duration_months,
    created_at,
    updated_at
  ) VALUES (
    target_gym_id,
    target_plan_id,
    'active',
    COALESCE(paid_amount, 0),
    'INR',
    'completed',
    start_date,
    end_date,
    COALESCE(duration_num_months, 1),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_sub_id;

  RETURN jsonb_build_object(
    'success', true,
    'gym_id', target_gym_id,
    'subscription_id', v_sub_id,
    'current_period_end', end_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION activate_gym_subscription_by_admin TO authenticated;
