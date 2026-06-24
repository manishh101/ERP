import { createApp } from "../server/src/app";

export const config = {
  maxDuration: 60,
};

const app = createApp();

export default app;
