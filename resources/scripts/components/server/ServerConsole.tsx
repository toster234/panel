import React, { lazy, memo } from 'react';
import { ServerContext } from '@/state/server';
import SuspenseSpinner from '@/components/elements/SuspenseSpinner';
import Can from '@/components/elements/Can';
import ContentContainer from '@/components/elements/ContentContainer';
import tw from 'twin.macro';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import ServerDetailsBlock from '@/components/server/ServerDetailsBlock';
import isEqual from 'react-fast-compare';
import PowerControls from '@/components/server/PowerControls';
import { EulaModalFeature } from '@feature/index';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

const ChunkedConsole = lazy(() => import(/* webpackChunkName: "console" */'@/components/server/Console'));
const ChunkedStatGraphs = lazy(() => import(/* webpackChunkName: "graphs" */'@/components/server/StatGraphs'));

const ServerConsole = () => {
    const isInstalling = ServerContext.useStoreState(state => state.server.data!.isInstalling);
    // @ts-ignore
    const eggFeatures: string[] = ServerContext.useStoreState(state => state.server.data!.eggFeatures, isEqual);

    return (
        <ServerContentBlock title={'Console'} css={tw`flex flex-wrap`}>
            <div css={tw`w-full lg:w-1/4`}>
                <ServerDetailsBlock/>
                {!isInstalling ?
                    <Can action={[ 'control.start', 'control.stop', 'control.restart' ]} matchAny>
                        <PowerControls/>
                    </Can>
                    :
                    <div css={tw`mt-4 rounded bg-yellow-500 p-3`}>
                        <ContentContainer>
                            <p css={tw`text-sm text-yellow-900`}>
                                This server is currently running its installation process and most actions are
                                unavailable.
                            </p>
                        </ContentContainer>
                    </div>
                }
            </div>
            <div css={tw`w-full lg:w-3/4 mt-4 lg:mt-0 lg:pl-4`}>
                <SuspenseSpinner>
                    <ChunkedConsole/>
                    <ChunkedStatGraphs/>
                </SuspenseSpinner>
                {eggFeatures.includes('eula') &&
                <React.Suspense fallback={null}>
                    <EulaModalFeature/>
                </React.Suspense>
                }
            </div>
        </ServerContentBlock>
    );
};

export default memo(ServerConsole, isEqual);
