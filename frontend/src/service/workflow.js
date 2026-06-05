import api from "./index";
export const createWorkflow = async (payload) => {
	try {
		const { data } = await api.post(`/api/workflows`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};

export const getAllWorkflows = async () => {
	try {
		const { data } = await api.get(`/api/workflows`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const getWorkflowById = async (id) => {
	try {
		const { data } = await api.get(`/api/workflows/${id}`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const getWorkflowRuns = async (id) => {
	try {
		const { data } = await api.get(`/api/workflows/${id}/runs`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const getWorkflowRunById = async (runId) => {
	try {
		const { data } = await api.get(`/api/workflows/runs/${runId}`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const deleteWorkflow = async (id) => {
	try {
		const { data } = await api.delete(`/api/workflows/${id}`);
		return data;
	} catch (error) {
		throw error;
	}
};

export const editWorkflow = async (id, payload) => {
	try {
		const { data } = await api.put(`/api/workflows/${id}`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};

export const playWorkflow = async (id, payload = {}) => {
	try {
		const { data } = await api.post(`/api/workflows/${id}/execute`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};

export const scheduleWorkflow = async (id, payload = {}) => {
	try {
		const { data } = await api.post(`/api/workflows/${id}/schedule`, payload);
		return data;
	} catch (error) {
		throw error;
	}
};
export const pauseWorkflow = async (id) => {
	try {
		const { data } = await api.post(`/api/workflows/${id}/pause`);
		return data;
	} catch (error) {
		throw error;
	}
};
