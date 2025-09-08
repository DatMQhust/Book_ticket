import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';
config({ path: envFile });

// Import all entities
import { TestEntity } from '../test/testConfig/test.entity';
import { UserEntity } from './users/entities/user.entity';
import { OrganizerEntity } from './organizers/entities/organizer.entity';
import { EventEntity } from './events/entities/event.entity';
import { TicketEntity } from './ticket/entities/ticket.entity';
import { OrderEntity } from './order/entities/order.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'nest_db',
  entities: [
    TestEntity,
    UserEntity,
    OrganizerEntity,
    EventEntity,
    TicketEntity,
    OrderEntity,
    // Add more entities here as needed
  ],
  migrations: ['src/migrations/**/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: process.env.DB_SYNC === 'true',
  logging: true,
});
