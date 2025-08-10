import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1754772794006 implements MigrationInterface {
  name = 'Initial1754772794006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "stock_prices" ("symbol" character varying(10) NOT NULL, "price" numeric(12,6) NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a42eff6e746633cc0a65fa01bce" PRIMARY KEY ("symbol", "timestamp"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_monitoring" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "symbol" character varying(10) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "last_fetch" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f8314fd3f58b4eb6cf6fded5f52" UNIQUE ("symbol"), CONSTRAINT "PK_b75728abc206b66c8ccfdfd165f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb `);
    await queryRunner.query(`SELECT create_hypertable('stock_prices', 'timestamp', if_not_exists => TRUE); `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stock_monitoring"`);
    await queryRunner.query(`DROP TABLE "stock_prices"`);
  }
}
