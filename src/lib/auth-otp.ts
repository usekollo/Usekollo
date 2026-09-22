// How many digits an emailed code has.
//
// The input grid (components/auth/OtpInputGrid) and the payload schema
// (lib/api/schemas) both read this, and lib/auth/otp-store generates codes of
// exactly this length — so changing it here changes all three together.
//
// Supabase's own "Email OTP Length" setting is deliberately not involved: this
// app mints and verifies its own codes, precisely so that a dashboard setting
// cannot dictate the shape of the UI.
export const OTP_LENGTH = 6;
