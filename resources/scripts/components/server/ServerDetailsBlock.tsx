import React, { useEffect, useState } from 'react';
import tw from 'twin.macro';
import { faCircle, faHdd, faMemory, faMicrochip, faServer } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { bytesToHuman, megabytesToHuman } from '@/helpers';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import { ServerContext } from '@/state/server';

interface Stats {
    memory: number;
    cpu: number;
    disk: number;
}

const ServerDetailsBlock = () => {
    const [ stats, setStats ] = useState<Stats>({ memory: 0, cpu: 0, disk: 0 });

    const status = ServerContext.useStoreState(state => state.status.value);
    const connected = ServerContext.useStoreState(state => state.socket.connected);
    const instance = ServerContext.useStoreState(state => state.socket.instance);

    const statsListener = (data: string) => {
        let stats: any = {};
        try {
            stats = JSON.parse(data);
        } catch (e) {
            return;
        }

        setStats({
            memory: stats.memory_bytes,
            cpu: stats.cpu_absolute,
            disk: stats.disk_bytes,
        });
    };

    useEffect(() => {
        if (!connected || !instance) {
            return;
        }

        instance.addListener('stats', statsListener);
        instance.send('send stats');

        return () => {
            instance.removeListener('stats', statsListener);
        };
    }, [ instance, connected ]);

    const name = ServerContext.useStoreState(state => state.server.data!.name);
    const limits = ServerContext.useStoreState(state => state.server.data!.limits);

    const disklimit = limits.disk ? megabytesToHuman(limits.disk) : 'Unlimited';
    const memorylimit = limits.memory ? megabytesToHuman(limits.memory) : 'Unlimited';

    return (
        <TitledGreyBox css={tw`break-words`} title={name} icon={faServer}>
            <p css={tw`text-xs uppercase`}>
                <FontAwesomeIcon
                    icon={faCircle}
                    fixedWidth
                    css={[
                        tw`mr-1`,
                        status === 'offline' ? tw`text-red-500` : (status === 'running' ? tw`text-green-500` : tw`text-yellow-500`),
                    ]}
                />
                &nbsp;{!status ? 'Connecting...' : status}
            </p>
            <p css={tw`text-xs mt-2`}>
                <FontAwesomeIcon icon={faMicrochip} fixedWidth css={tw`mr-1`}/> {stats.cpu.toFixed(2)}%
            </p>
            <p css={tw`text-xs mt-2`}>
                <FontAwesomeIcon icon={faMemory} fixedWidth css={tw`mr-1`}/> {bytesToHuman(stats.memory)}
                <span css={tw`text-neutral-500`}> / {memorylimit}</span>
            </p>
            <p css={tw`text-xs mt-2`}>
                <FontAwesomeIcon icon={faHdd} fixedWidth css={tw`mr-1`}/>&nbsp;{bytesToHuman(stats.disk)}
                <span css={tw`text-neutral-500`}> / {disklimit}</span>
            </p>
        </TitledGreyBox>
    );
};

export default ServerDetailsBlock;
