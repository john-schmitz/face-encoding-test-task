const config = {
	modulePathIgnorePatterns: ["<rootDir>/dist/"],
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	preset: "ts-jest",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
};

module.exports = config;
