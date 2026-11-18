/**
 * Precomputed Argon2id hash of a random constant. An unknown email is verified
 * against it so the response time cannot reveal whether an account exists (8.6).
 */
export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$OX/8SLS1fHsFR/EvMDgeMw$QVPAj1uRC+d+T6kn0dQjZ+P5+ez+5C6RkhWkE8MO3t4';
