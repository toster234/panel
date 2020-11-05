<?php

namespace Pterodactyl\Repositories\Eloquent;

use Pterodactyl\Models\Server;
use Illuminate\Support\Collection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Pterodactyl\Exceptions\Repository\RecordNotFoundException;
use Pterodactyl\Contracts\Repository\ServerRepositoryInterface;

class ServerRepository extends EloquentRepository implements ServerRepositoryInterface
{
    /**
     * Return the model backing this repository.
     *
     * @return string
     */
    public function model()
    {
        return Server::class;
    }

    /**
     * Load the egg relations onto the server model.
     *
     * @param \Pterodactyl\Models\Server $server
     * @param bool $refresh
     * @return \Pterodactyl\Models\Server
     */
    public function loadEggRelations(Server $server, bool $refresh = false): Server
    {
        if (! $server->relationLoaded('egg') || $refresh) {
            $server->load('egg.scriptFrom');
        }

        return $server;
    }

    /**
     * Return a collection of servers with their associated data for rebuild operations.
     *
     * @param int|null $server
     * @param int|null $node
     * @return \Illuminate\Support\Collection
     */
    public function getDataForRebuild(int $server = null, int $node = null): Collection
    {
        $instance = $this->getBuilder()->with(['allocation', 'allocations', 'egg', 'node']);

        if (! is_null($server) && is_null($node)) {
            $instance = $instance->where('id', '=', $server);
        } else if (is_null($server) && ! is_null($node)) {
            $instance = $instance->where('node_id', '=', $node);
        }

        return $instance->get($this->getColumns());
    }

    /**
     * Return a collection of servers with their associated data for reinstall operations.
     *
     * @param int|null $server
     * @param int|null $node
     * @return \Illuminate\Support\Collection
     */
    public function getDataForReinstall(int $server = null, int $node = null): Collection
    {
        $instance = $this->getBuilder()->with(['allocation', 'allocations', 'egg', 'node']);

        if (! is_null($server) && is_null($node)) {
            $instance = $instance->where('id', '=', $server);
        } else if (is_null($server) && ! is_null($node)) {
            $instance = $instance->where('node_id', '=', $node);
        }

        return $instance->get($this->getColumns());
    }

    /**
     * Return a server model and all variables associated with the server.
     *
     * @param int $id
     * @return \Pterodactyl\Models\Server
     *
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function findWithVariables(int $id): Server
    {
        try {
            return $this->getBuilder()->with('egg.variables', 'variables')
                ->where($this->getModel()->getKeyName(), '=', $id)
                ->firstOrFail($this->getColumns());
        } catch (ModelNotFoundException $exception) {
            throw new RecordNotFoundException;
        }
    }

    /**
     * Get the primary allocation for a given server. If a model is passed into
     * the function, load the allocation relationship onto it. Otherwise, find and
     * return the server from the database.
     *
     * @param \Pterodactyl\Models\Server $server
     * @param bool $refresh
     * @return \Pterodactyl\Models\Server
     */
    public function getPrimaryAllocation(Server $server, bool $refresh = false): Server
    {
        if (! $server->relationLoaded('allocation') || $refresh) {
            $server->load('allocation');
        }

        return $server;
    }

    /**
     * Return enough data to be used for the creation of a server via the daemon.
     *
     * @param \Pterodactyl\Models\Server $server
     * @param bool $refresh
     * @return \Pterodactyl\Models\Server
     */
    public function getDataForCreation(Server $server, bool $refresh = false): Server
    {
        foreach (['allocation', 'allocations', 'egg'] as $relation) {
            if (! $server->relationLoaded($relation) || $refresh) {
                $server->load($relation);
            }
        }

        return $server;
    }

    /**
     * Load associated databases onto the server model.
     *
     * @param \Pterodactyl\Models\Server $server
     * @param bool $refresh
     * @return \Pterodactyl\Models\Server
     */
    public function loadDatabaseRelations(Server $server, bool $refresh = false): Server
    {
        if (! $server->relationLoaded('databases') || $refresh) {
            $server->load('databases.host');
        }

        return $server;
    }

    /**
     * Get data for use when updating a server on the Daemon. Returns an array of
     * the egg which is used for build and rebuild. Only loads relations
     * if they are missing, or refresh is set to true.
     *
     * @param \Pterodactyl\Models\Server $server
     * @param bool $refresh
     * @return array
     */
    public function getDaemonServiceData(Server $server, bool $refresh = false): array
    {
        if (! $server->relationLoaded('egg') || $refresh) {
            $server->load('egg');
        }

        return [
            'egg' => $server->getRelation('egg')->uuid,
        ];
    }

    /**
     * Return a server by UUID.
     *
     * @param string $uuid
     * @return \Pterodactyl\Models\Server
     *
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function getByUuid(string $uuid): Server
    {
        try {
            /** @var \Pterodactyl\Models\Server $model */
            $model = $this->getBuilder()
                ->with('nest', 'node')
                ->where(function (Builder $query) use ($uuid) {
                    $query->where('uuidShort', $uuid)->orWhere('uuid', $uuid);
                })
                ->firstOrFail($this->getColumns());

            return $model;
        } catch (ModelNotFoundException $exception) {
            throw new RecordNotFoundException;
        }
    }

    /**
     * Return all of the servers that should have a power action performed against them.
     *
     * @param int[] $servers
     * @param int[] $nodes
     * @param bool $returnCount
     * @return int|\Illuminate\Support\LazyCollection
     */
    public function getServersForPowerAction(array $servers = [], array $nodes = [], bool $returnCount = false)
    {
        $instance = $this->getBuilder();

        if (! empty($nodes) && ! empty($servers)) {
            $instance->whereIn('id', $servers)->orWhereIn('node_id', $nodes);
        } else if (empty($nodes) && ! empty($servers)) {
            $instance->whereIn('id', $servers);
        } else if (! empty($nodes) && empty($servers)) {
            $instance->whereIn('node_id', $nodes);
        }

        if ($returnCount) {
            return $instance->count();
        }

        return $instance->with('node')->cursor();
    }

    /**
     * Return the total number of servers that will be affected by the query.
     *
     * @param int[] $servers
     * @param int[] $nodes
     * @return int
     */
    public function getServersForPowerActionCount(array $servers = [], array $nodes = []): int
    {
        return $this->getServersForPowerAction($servers, $nodes, true);
    }

    /**
     * Check if a given UUID and UUID-Short string are unique to a server.
     *
     * @param string $uuid
     * @param string $short
     * @return bool
     */
    public function isUniqueUuidCombo(string $uuid, string $short): bool
    {
        return ! $this->getBuilder()->where('uuid', '=', $uuid)->orWhere('uuidShort', '=', $short)->exists();
    }

    /**
     * Get the amount of servers that are suspended.
     *
     * @return int
     */
    public function getSuspendedServersCount(): int
    {
        return $this->getBuilder()->where('suspended', true)->count();
    }

    /**
     * Returns all of the servers that exist for a given node in a paginated response.
     *
     * @param int $node
     * @param int $limit
     *
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function loadAllServersForNode(int $node, int $limit): LengthAwarePaginator
    {
        return $this->getBuilder()
            ->with(['user', 'nest', 'egg'])
            ->where('node_id', '=', $node)
            ->paginate($limit);
    }
}
