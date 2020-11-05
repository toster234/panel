<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Repositories\Eloquent\ServerRepository;
use Pterodactyl\Services\Servers\ReinstallServerService;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\Settings\RenameServerRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Settings\ReinstallServerRequest;

class SettingsController extends ClientApiController
{
    /**
     * @var \Pterodactyl\Repositories\Eloquent\ServerRepository
     */
    private $repository;

    /**
     * @var \Pterodactyl\Services\Servers\ReinstallServerService
     */
    private $reinstallServerService;

    /**
     * SettingsController constructor.
     *
     * @param \Pterodactyl\Repositories\Eloquent\ServerRepository $repository
     * @param \Pterodactyl\Services\Servers\ReinstallServerService $reinstallServerService
     */
    public function __construct(
        ServerRepository $repository,
        ReinstallServerService $reinstallServerService
    ) {
        parent::__construct();

        $this->repository = $repository;
        $this->reinstallServerService = $reinstallServerService;
    }

    /**
     * Renames a server.
     *
     * @param \Pterodactyl\Http\Requests\Api\Client\Servers\Settings\RenameServerRequest $request
     * @param \Pterodactyl\Models\Server $server
     * @return \Illuminate\Http\JsonResponse
     *
     * @throws \Pterodactyl\Exceptions\Model\DataValidationException
     * @throws \Pterodactyl\Exceptions\Repository\RecordNotFoundException
     */
    public function rename(RenameServerRequest $request, Server $server)
    {
        $this->repository->update($server->id, [
            'name' => $request->input('name'),
        ]);

        return new JsonResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Reinstalls the server on the daemon.
     *
     * @param \Pterodactyl\Http\Requests\Api\Client\Servers\Settings\ReinstallServerRequest $request
     * @param \Pterodactyl\Models\Server $server
     * @return \Illuminate\Http\JsonResponse
     *
     * @throws \Throwable
     */
    public function reinstall(ReinstallServerRequest $request, Server $server)
    {
        $this->reinstallServerService->handle($server);

        return new JsonResponse([], Response::HTTP_ACCEPTED);
    }
}
