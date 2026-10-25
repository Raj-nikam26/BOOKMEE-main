import client from "./client";

export const listServices = () => client.get("/services");

export const createService = (payload) => client.post("/services", payload);

export const updateService = (id, payload) =>
  client.patch(`/services/${id}`, payload);

export const deleteService = (id) => client.delete(`/services/${id}`);
