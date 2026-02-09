export function generateOtp(length: number = 6): string {
  let otp = "";

  // Generate a random number for each digit of the OTP
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10); // Generates a random digit (0-9)
  }

  return otp;
}
