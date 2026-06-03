/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { authClient } from "@/config/auth";
import { Button, Input, message, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { FiShield, FiMail, FiLock, FiUser, FiUserPlus } from "react-icons/fi";

const { Title, Paragraph } = Typography;

const Signup = () => {
	const router = useRouter();

	const [info, setInfo] = useState({
		email: "",
		password: "",
		name: "",
		loading: false,
	});

	const handleOnChange = useCallback((key, value) => {
		setInfo((prev) => ({ ...prev, [key]: value }));
	}, []);

	const handlSubmit = useCallback(async () => {
		try {
			if (info?.loading) {
				return;
			}
			if (!info?.email || !info?.name || !info?.password) {
				return message.error("Please enter your name, email, and password");
			}

			setInfo((prev) => ({ ...prev, loading: true }));

			const payload = {
				email: info?.email,
				password: info?.password,
				name: info?.name,
			};

			const { data } = await authClient.signUp.email(payload);
			const { user } = data;

			localStorage.setItem("user", JSON.stringify(user));
			message.success("Account created successfully");
			return router.push("/dashboard");
		} catch (error) {
			console.log("error==>handlSubmit", error);
			message.error("Something went wrong during signup");
		} finally {
			setInfo((prev) => ({ ...prev, loading: false }));
		}
	}, [info?.email, info?.loading, info?.password, info?.name, router]);

	return (
		<div className="flex flex-col min-h-screen bg-blue-50/50 items-center justify-center p-6 font-sans">
			{/* Signup Card */}
			<div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden flex flex-col mt-8">
				{/* Card Header */}
				<div className="flex flex-col items-center px-8 pt-10 pb-6 border-b border-gray-50 text-center">
					<Title level={3} className="!m-0 !text-gray-900 !font-bold">
						Create Account
					</Title>
					<Paragraph className="!text-gray-500 !mt-2 !mb-0 text-sm">
						Register to access the dashboard.
					</Paragraph>
				</div>

				{/* Form Body */}
				<div className="flex flex-col px-8 py-8 space-y-5">
					{/* Full Name Input */}
					<div className="flex flex-col space-y-2">
						<label className="text-sm font-semibold text-gray-700">
							Full Name
						</label>
						<Input
							size="large"
							prefix={<FiUser className="text-gray-400 mr-1" />}
							placeholder="Alex Doe"
							value={info.name}
							onChange={(e) => handleOnChange("name", e.target.value)}
							className="rounded-lg hover:border-blue-400 focus:border-blue-600 px-3 py-2 text-base"
							onPressEnter={handlSubmit}
						/>
					</div>

					{/* Email Input */}
					<div className="flex flex-col space-y-2">
						<label className="text-sm font-semibold text-gray-700">
							Email Address
						</label>
						<Input
							size="large"
							prefix={<FiMail className="text-gray-400 mr-1" />}
							placeholder="analyst@soc.local"
							value={info.email}
							onChange={(e) => handleOnChange("email", e.target.value)}
							className="rounded-lg hover:border-blue-400 focus:border-blue-600 px-3 py-2 text-base"
							onPressEnter={handlSubmit}
						/>
					</div>

					{/* Password Input */}
					<div className="flex flex-col space-y-2">
						<label className="text-sm font-semibold text-gray-700">
							Password
						</label>
						<Input.Password
							size="large"
							prefix={<FiLock className="text-gray-400 mr-1" />}
							placeholder="••••••••"
							value={info.password}
							onChange={(e) => handleOnChange("password", e.target.value)}
							className="rounded-lg hover:border-blue-400 focus:border-blue-600 px-3 py-2 text-base"
							onPressEnter={handlSubmit}
						/>
					</div>

					{/* Submit Button */}
					<div className="pt-4">
						<Button
							type="primary"
							size="large"
							className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-lg text-base font-medium shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2"
							onClick={handlSubmit}
							loading={info?.loading}
						>
							<span>Create Account</span>
							{!info?.loading && <FiUserPlus />}
						</Button>
					</div>
				</div>

				<div className="bg-gray-50 px-8 py-5 text-center border-t border-gray-100 flex flex-col items-center">
					<span className="text-sm text-gray-600">
						Already have an account?{" "}
						<Link
							href="/signin"
							className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
						>
							Sign in here
						</Link>
					</span>
				</div>
			</div>

			<Link
				href="/"
				className="mt-8 text-sm text-gray-500 hover:text-blue-600 font-medium flex items-center space-x-1 transition-colors"
			>
				<span>← Back to Homepage</span>
			</Link>
		</div>
	);
};

export default Signup;
