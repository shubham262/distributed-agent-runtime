import api from "./index";
export const createAgent = async (payload) => {
	try {
		const { data } = await api.post(`/api/agents`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};

export const getAllAgent = async () => {
	try {
		const { data } = await api.get(`/api/agents`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const getAgentTools = async () => {
	try {
		const { data } = await api.get(`/api/agents/agents/tools`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const deleteAgent = async (id) => {
	try {
		const { data } = await api.delete(`/api/agents/${id}`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const editAgent = async (id, payload) => {
	try {
		const { data } = await api.put(`/api/agents/${id}`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};

export const playAgent = async (id, payload = {}) => {
	try {
		const { data } = await api.post(`/api/agents/${id}/play`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};
export const pauseAgent = async (id) => {
	try {
		const { data } = await api.post(`/api/agents/${id}/pause`);
		return data;
	} catch (error) {
		throw error;
	}
};
