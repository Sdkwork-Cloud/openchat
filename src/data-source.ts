import { DataSource } from "typeorm";
import { loadOpenChatEnvironment } from "./common/config/env-loader";
import { createTypeOrmDataSourceOptions } from "./common/config/typeorm.options";

loadOpenChatEnvironment();

export const AppDataSource = new DataSource(createTypeOrmDataSourceOptions());
