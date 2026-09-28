import { MigrationInterface, QueryRunner } from 'typeorm';

export class Market1780000000000 implements MigrationInterface {
  name = 'Market1780000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  CREATE TABLE import_jobs (
    id bigserial PRIMARY KEY,
    dataset text NOT NULL CHECK (dataset IN ('solar-actual','solar-forecast','afrr','mfrr')),
    "from" timestamptz NOT NULL, "to" timestamptz NOT NULL,
    priority text NOT NULL CHECK (priority IN ('live','history')),
    state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','published','running','retry','complete','dead')),
    attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    next_attempt_at timestamptz NOT NULL DEFAULT now(), error text,
    fetch_ms double precision, queue_ms double precision, processing_ms double precision,
    CHECK ("to" > "from")
  );
  CREATE UNIQUE INDEX import_jobs_active ON import_jobs(dataset,"from","to") WHERE state IN ('pending','published','running','retry');
  CREATE INDEX import_jobs_dispatch ON import_jobs(state,next_attempt_at);
  CREATE TABLE source_documents (
    hash text PRIMARY KEY, dataset text NOT NULL, source_id text NOT NULL, revision integer NOT NULL,
    source_created_at timestamptz, first_seen_at timestamptz NOT NULL, stored_at timestamptz NOT NULL DEFAULT now(), xml text NOT NULL
  );
  CREATE TABLE market_snapshots (
    id bigserial PRIMARY KEY, dataset text NOT NULL, "from" timestamptz NOT NULL, "to" timestamptz NOT NULL,
    content_hash text NOT NULL, fetched_at timestamptz NOT NULL, stored_at timestamptz NOT NULL DEFAULT now(),
    source_created_at timestamptz, revision integer NOT NULL, no_data boolean NOT NULL
  );
  CREATE TABLE snapshot_documents (
    snapshot_id bigint NOT NULL REFERENCES market_snapshots(id), document_hash text NOT NULL REFERENCES source_documents(hash),
    PRIMARY KEY(snapshot_id,document_hash)
  );
  CREATE TABLE generation_intervals (
    snapshot_id bigint NOT NULL REFERENCES market_snapshots(id), start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
    series_id text NOT NULL, mw numeric, resolution_seconds integer NOT NULL, revision integer NOT NULL, cancelled boolean NOT NULL,
    PRIMARY KEY(snapshot_id,series_id,start_at,end_at)
  );
  CREATE TABLE balancing_bids (
    snapshot_id bigint NOT NULL REFERENCES market_snapshots(id), start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
    bid_id text NOT NULL, direction text NOT NULL, product_type text NOT NULL, currency text, mw numeric NOT NULL, price numeric,
    available boolean, cancelled boolean NOT NULL, divisible boolean, complexity text,
    validity_start timestamptz, validity_end timestamptz, resolution_seconds integer NOT NULL, revision integer NOT NULL,
    PRIMARY KEY(snapshot_id,bid_id,start_at,end_at)
  );
  CREATE TABLE market_windows (
    dataset text NOT NULL, "from" timestamptz NOT NULL, "to" timestamptz NOT NULL,
    snapshot_id bigint REFERENCES market_snapshots(id), checked_at timestamptz NOT NULL DEFAULT now(),
    last_success_at timestamptz, error text, no_data boolean NOT NULL DEFAULT false,
    PRIMARY KEY(dataset,"from","to")
  );
  CREATE INDEX market_windows_range ON market_windows(dataset,"from","to");
  CREATE TABLE market_changes (
    id bigserial PRIMARY KEY, dataset text NOT NULL, "from" timestamptz NOT NULL, "to" timestamptz NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
  );
  CREATE TABLE scheduler_state (key text PRIMARY KEY, updated_at timestamptz NOT NULL DEFAULT now());
`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  DROP TABLE scheduler_state, market_changes, market_windows, balancing_bids, generation_intervals,
    snapshot_documents, market_snapshots, source_documents, import_jobs;
`);
  }
}
