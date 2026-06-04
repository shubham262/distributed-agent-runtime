export const serializeUser = (user) => ({
	...user,
	createdAt: user.createdAt?.toISOString?.(),
	updatedAt: user.updatedAt?.toISOString?.(),
});
export const nameShortner = (name) => {
	let arr = name.split(" ");
	const firstName = arr[0] || "";
	const secondName = arr[1] || "";

	return (firstName?.[0] || "") + (secondName[0] || "");
};
