package database

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/smith-dallin/manager-dashboard/internal/logger"
)

// QueryTracer logs slow database queries for performance monitoring
type QueryTracer struct {
	log           *logger.Logger
	slowThreshold time.Duration
}

// NewQueryTracer creates a new query tracer
// Queries taking longer than slowThreshold will be logged at WARN level
func NewQueryTracer(log *logger.Logger, slowThreshold time.Duration) *QueryTracer {
	return &QueryTracer{
		log:           log.WithComponent("database"),
		slowThreshold: slowThreshold,
	}
}

// queryStartKey is the context key for storing query start time
type queryStartKey struct{}

// TraceQueryStart is called at the beginning of Query, QueryRow, and Exec calls
func (t *QueryTracer) TraceQueryStart(ctx context.Context, conn *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	return context.WithValue(ctx, queryStartKey{}, time.Now())
}

// TraceQueryEnd is called after Query, QueryRow, and Exec calls
func (t *QueryTracer) TraceQueryEnd(ctx context.Context, conn *pgx.Conn, data pgx.TraceQueryEndData) {
	startTime, ok := ctx.Value(queryStartKey{}).(time.Time)
	if !ok {
		return
	}

	duration := time.Since(startTime)

	// Always log errors
	if data.Err != nil {
		t.log.WithContext(ctx).Error("Database query failed",
			"sql", truncateSQL(data.CommandTag.String()),
			"duration_ms", duration.Milliseconds(),
			"error", data.Err.Error(),
		)
		return
	}

	// Log slow queries at WARN level
	if duration >= t.slowThreshold {
		t.log.WithContext(ctx).Warn("Slow database query",
			"sql", truncateSQL(data.CommandTag.String()),
			"duration_ms", duration.Milliseconds(),
			"rows_affected", data.CommandTag.RowsAffected(),
		)
		return
	}

	// Log all queries at DEBUG level for development
	t.log.WithContext(ctx).Debug("Database query completed",
		"sql", truncateSQL(data.CommandTag.String()),
		"duration_ms", duration.Milliseconds(),
		"rows_affected", data.CommandTag.RowsAffected(),
	)
}

// truncateSQL truncates long SQL statements for logging
func truncateSQL(sql string) string {
	const maxLen = 200
	if len(sql) <= maxLen {
		return sql
	}
	return sql[:maxLen] + "..."
}
