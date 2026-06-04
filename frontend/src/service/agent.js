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
