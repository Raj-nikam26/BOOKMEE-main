import client from "./client";

export const requestRegistrationOtp = (email) =>
  client.post("/auth/register/otp", { email });

export const verifyRegistrationOtp = (payload) =>
  client.post("/auth/register/otp/verify", payload);

export const register = (payload) => client.post("/auth/register", payload);

export const login = (payload) => client.post("/auth/login", payload);

export const getMe = () => client.get("/auth/me");

export const updateProfile = (payload) => client.put("/auth/profile", payload);

export const getGoogleConnectUrl = () => client.get("/auth/google/connect");
