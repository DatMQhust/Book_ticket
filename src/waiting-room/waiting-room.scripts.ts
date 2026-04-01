/**
 * Lua Scripts cho Virtual Waiting Room
 *
 * Về Redis key prefix ('highshow:'):
 * ioredis với keyPrefix config tự động prepend prefix vào tất cả KEYS[] trong eval().
 * → Service truyền key KHÔNG có prefix (giống pattern trong bookings.service.ts).
 *
 * Ngoại lệ duy nhất: key được BUILD BÊN TRONG Lua bằng string concat (không qua ioredis)
 * → phải dùng KEY_PREFIX thủ công. Xem ADVANCE_QUEUE_SCRIPT ARGV[5].
 */

export const KEY_PREFIX = 'highshow:';

/**
 * JOIN_OR_QUEUE_SCRIPT — Atomic: cấp token ngay hoặc đẩy vào queue
 *
 * KEYS[1] = wr:config:{eventId}         (Hash: enabled, maxConcurrent, maxQueueSize)
 * KEYS[2] = wr:active:{eventId}         (Set: userId đang giữ slot)
 * KEYS[3] = wr:queue:{eventId}          (Sorted Set: userId → timestamp FIFO)
 * KEYS[4] = wr:token:{userId}:{eventId} (String: token UUID, TTL 300s)
 *
 * ARGV[1] = userId
 * ARGV[2] = timestamp (score cho Sorted Set)
 * ARGV[3] = generated token UUID
 * ARGV[4] = token TTL (seconds, default 300)
 * ARGV[5] = maxQueueSize fallback (nếu config chưa set)
 *
 * Return codes:
 *   {0}              → WR tắt (disabled)
 *   {1, token, ttl}  → Cấp token thành công (slot trống hoặc reconnect)
 *   {2, position}    → Đã vào queue (position 1-based)
 *   {3, queueSize}   → Queue đầy
 */
export const JOIN_OR_QUEUE_SCRIPT = `
local enabled = redis.call('HGET', KEYS[1], 'enabled')
if enabled ~= '1' then
  return {0, ''}
end

local maxConcurrent = tonumber(redis.call('HGET', KEYS[1], 'maxConcurrent'))
if not maxConcurrent then
  return {0, ''}
end

-- Reconnect case: user đã trong active set → trả token hiện có
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
  local existingToken = redis.call('GET', KEYS[4])
  if existingToken then
    local ttl = redis.call('TTL', KEYS[4])
    return {1, existingToken, tostring(ttl)}
  end
  -- Token expired nhưng vẫn trong active → xóa để re-evaluate
  redis.call('SREM', KEYS[2], ARGV[1])
end

-- Reconnect case: user đã trong queue → trả position hiện tại
local existingScore = redis.call('ZSCORE', KEYS[3], ARGV[1])
if existingScore then
  local rank = redis.call('ZRANK', KEYS[3], ARGV[1])
  return {2, tostring(rank + 1)}
end

-- Còn slot trống → cấp token ngay
local activeCount = redis.call('SCARD', KEYS[2])
if activeCount < maxConcurrent then
  redis.call('SADD', KEYS[2], ARGV[1])
  redis.call('SET', KEYS[4], ARGV[3], 'EX', tonumber(ARGV[4]))
  return {1, ARGV[3], ARGV[4]}
end

-- Slot đầy → check queue limit
local queueSize = redis.call('ZCARD', KEYS[3])
local maxQueue = tonumber(redis.call('HGET', KEYS[1], 'maxQueueSize'))
if not maxQueue then
  maxQueue = tonumber(ARGV[5])
end
if queueSize >= maxQueue then
  return {3, tostring(queueSize)}
end

-- Enqueue
redis.call('ZADD', KEYS[3], ARGV[2], ARGV[1])
local rank = redis.call('ZRANK', KEYS[3], ARGV[1])
return {2, tostring(rank + 1)}
`;

/**
 * ADVANCE_QUEUE_SCRIPT — Atomic: free slot + pop next user + cấp token
 *
 * KEYS[1] = wr:active:{eventId}   (Set)
 * KEYS[2] = wr:queue:{eventId}    (Sorted Set)
 * KEYS[3] = wr:config:{eventId}   (Hash)
 *
 * ARGV[1] = userId cần free slot ("" nếu chỉ advance không free)
 * ARGV[2] = generated token UUID cho người tiếp theo
 * ARGV[3] = token TTL (seconds, default 300)
 * ARGV[4] = eventId (để build token key)
 * ARGV[5] = key prefix (e.g. "highshow:") — bắt buộc vì token key được build bên
 *           trong Lua sau ZPOPMIN (nextUserId không biết trước), redis.call() nội
 *           bộ bypass ioredis nên không được auto-prefix
 *
 * Return:
 *   nil                  → Không advance (slot vẫn đầy hoặc queue rỗng)
 *   {nextUserId, token}  → Advance thành công
 */
export const ADVANCE_QUEUE_SCRIPT = `
-- 1. Free slot của user hiện tại (nếu có)
if ARGV[1] ~= '' then
  redis.call('SREM', KEYS[1], ARGV[1])
end

-- 2. Check còn slot trống không
local maxConcurrent = tonumber(redis.call('HGET', KEYS[3], 'maxConcurrent'))
if not maxConcurrent then return nil end

local activeCount = redis.call('SCARD', KEYS[1])
if activeCount >= maxConcurrent then
  return nil
end

-- 3. Pop người đầu queue (FIFO theo score = timestamp)
local next = redis.call('ZPOPMIN', KEYS[2])
if #next == 0 then
  return nil
end

local nextUserId = next[1]

-- 4. Thêm vào active set + tạo token (atomic)
-- Token key build trong Lua → phải dùng full prefix thủ công (bypass ioredis)
redis.call('SADD', KEYS[1], nextUserId)
local tokenKey = ARGV[5] .. 'wr:token:' .. nextUserId .. ':' .. ARGV[4]
redis.call('SET', tokenKey, ARGV[2], 'EX', tonumber(ARGV[3]))

return {nextUserId, ARGV[2]}
`;

/**
 * REMOVE_FROM_QUEUE_SCRIPT — Xóa user khỏi hàng chờ
 *
 * KEYS[1] = wr:queue:{eventId}  (Sorted Set)
 * ARGV[1] = userId
 *
 * Return: số phần tử đã xóa (0 hoặc 1)
 */
export const REMOVE_FROM_QUEUE_SCRIPT = `
return redis.call('ZREM', KEYS[1], ARGV[1])
`;
