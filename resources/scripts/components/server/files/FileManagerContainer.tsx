import React, { useEffect } from 'react';
import { httpErrorToHuman } from '@/api/http';
import { CSSTransition } from 'react-transition-group';
import Spinner from '@/components/elements/Spinner';
import FileObjectRow from '@/components/server/files/FileObjectRow';
import FileManagerBreadcrumbs from '@/components/server/files/FileManagerBreadcrumbs';
import { FileObject } from '@/api/server/files/loadDirectory';
import NewDirectoryButton from '@/components/server/files/NewDirectoryButton';
import { NavLink, useLocation } from 'react-router-dom';
import Can from '@/components/elements/Can';
import ServerError from '@/components/screens/ServerError';
import tw from 'twin.macro';
import Button from '@/components/elements/Button';
import { ServerContext } from '@/state/server';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import MassActionsBar from '@/components/server/files/MassActionsBar';
import UploadButton from '@/components/server/files/UploadButton';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { useStoreActions } from '@/state/hooks';
import ErrorBoundary from '@/components/elements/ErrorBoundary';

const sortFiles = (files: FileObject[]): FileObject[] => {
    return files.sort((a, b) => a.name.localeCompare(b.name))
        .sort((a, b) => a.isFile === b.isFile ? 0 : (a.isFile ? 1 : -1));
};

export default () => {
    const id = ServerContext.useStoreState(state => state.server.data!.id);
    const { hash } = useLocation();
    const { data: files, error, mutate } = useFileManagerSwr();
    const directory = ServerContext.useStoreState(state => state.files.directory);
    const clearFlashes = useStoreActions(actions => actions.flashes.clearFlashes);
    const setDirectory = ServerContext.useStoreActions(actions => actions.files.setDirectory);
    const setSelectedFiles = ServerContext.useStoreActions(actions => actions.files.setSelectedFiles);

    useEffect(() => {
        clearFlashes('files');
        setSelectedFiles([]);
        setDirectory(hash.length > 0 ? hash : '/');
    }, [ hash ]);

    useEffect(() => {
        mutate();
    }, [ directory ]);

    if (error) {
        return (
            <ServerError message={httpErrorToHuman(error)} onRetry={() => mutate()}/>
        );
    }

    return (
        <ServerContentBlock title={'File Manager'} showFlashKey={'files'}>
            <ErrorBoundary>
                <FileManagerBreadcrumbs/>
            </ErrorBoundary>
            {
                !files ?
                    <Spinner size={'large'} centered/>
                    :
                    <>
                        {!files.length ?
                            <p css={tw`text-sm text-neutral-400 text-center`}>
                                This directory seems to be empty.
                            </p>
                            :
                            <CSSTransition classNames={'fade'} timeout={150} appear in>
                                <div>
                                    {files.length > 250 &&
                                    <div css={tw`rounded bg-yellow-400 mb-px p-3`}>
                                        <p css={tw`text-yellow-900 text-sm text-center`}>
                                            This directory is too large to display in the browser,
                                            limiting the output to the first 250 files.
                                        </p>
                                    </div>
                                    }
                                    {
                                        sortFiles(files.slice(0, 250)).map(file => (
                                            <FileObjectRow key={file.key} file={file}/>
                                        ))
                                    }
                                    <MassActionsBar/>
                                </div>
                            </CSSTransition>
                        }
                        <Can action={'file.create'}>
                            <ErrorBoundary>
                                <div css={tw`flex flex-wrap-reverse justify-end mt-4`}>
                                    <NewDirectoryButton css={tw`w-full flex-none mt-4 sm:mt-0 sm:w-auto sm:mr-4`}/>
                                    <UploadButton css={tw`flex-1 mr-4 sm:flex-none sm:mt-0`}/>
                                    <NavLink
                                        to={`/server/${id}/files/new${window.location.hash}`}
                                        css={tw`flex-1 sm:flex-none sm:mt-0`}
                                    >
                                        <Button css={tw`w-full`}>
                                            New File
                                        </Button>
                                    </NavLink>
                                </div>
                            </ErrorBoundary>
                        </Can>
                    </>
            }
        </ServerContentBlock>
    );
};
