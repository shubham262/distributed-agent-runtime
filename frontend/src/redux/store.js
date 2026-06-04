const { configureStore } = require("@reduxjs/toolkit");
import authReducer from "./authSlice";

const makeStore = () =>
	configureStore({
		reducer: {
			auth: authReducer,
		},
	});

export default makeStore;
