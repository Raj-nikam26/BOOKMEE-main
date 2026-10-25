import client from "./client";

export const getAvailability = () => client.get("/availability");

export const saveAvailability = (payload) =>
  client.put("/availability", payload);
