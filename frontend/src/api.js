import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8085/api"
});

// COMPANY APIs
export const getCompanies = () => API.get("/companies");
export const createCompany = (data) => API.post("/companies", data);
export const deleteCompany = (id) => API.delete(`/companies/${id}`);

// SHARE APIs
export const getShares = () => API.get("/shares");
export const createShare = (data) => API.post("/shares", data);

export default API;