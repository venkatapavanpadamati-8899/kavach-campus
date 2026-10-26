/**
 * KAVACH CAMPUS — DEMO OTP & DEVELOPMENT AUTHENTICATION HELPER
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. Demo OTP is ONLY active when process.env.NODE_ENV !== 'production' AND process.env.ENABLE_DEMO_OTP === 'true'.
 * 2. In production mode (or when ENABLE_DEMO_OTP is not explicitly 'true'), this helper strictly returns FALSE.
 * 3. Privileged roles (ADMIN, SUPER_ADMIN, MANAGEMENT, PRINCIPAL, HOD) can NEVER authenticate or verify via Demo OTP.
 * 4. Fixed Demo OTP value is strictly restricted to development environments.
 */

export const DEMO_OTP_VALUE = '123456';

const PRIVILEGED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGEMENT', 'PRINCIPAL', 'HOD'];

/**
 * Checks whether Demo OTP is currently enabled by environment configuration.
 * Always returns false in production environments.
 */
export function isDemoOtpEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  // Only read the server-side ENABLE_DEMO_OTP variable.
  // NEXT_PUBLIC_* variables are embedded in the client-side bundle at build time;
  // reading them server-side to gate demo features is a security anti-pattern.
  return process.env.ENABLE_DEMO_OTP === 'true';
}

/**
 * Validates whether an incoming OTP matches the demo OTP, subject to strict environment and role constraints.
 *
 * @param inputOtp The 6-digit OTP entered by the user
 * @param intendedRole The role of the user (e.g. 'STUDENT', 'STAFF', 'ADMIN')
 * @returns true ONLY if in development mode, ENABLE_DEMO_OTP is active, the role is non-privileged, and OTP matches.
 */
export function verifyDemoOtp(inputOtp?: string, intendedRole?: string): boolean {
  if (!isDemoOtpEnabled()) {
    return false;
  }

  if (!inputOtp || typeof inputOtp !== 'string') {
    return false;
  }

  // Strictly block any privileged administrative role from using demo OTP
  if (intendedRole && PRIVILEGED_ROLES.includes(intendedRole.toUpperCase())) {
    return false;
  }

  return inputOtp.trim() === DEMO_OTP_VALUE;
}
