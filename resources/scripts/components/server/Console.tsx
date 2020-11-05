import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ITerminalOptions, Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { SearchBarAddon } from 'xterm-addon-search-bar';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ServerContext } from '@/state/server';
import styled from 'styled-components/macro';
import { usePermissions } from '@/plugins/usePermissions';
import tw, { theme as th } from 'twin.macro';
import 'xterm/css/xterm.css';
import useEventListener from '@/plugins/useEventListener';
import { debounce } from 'debounce';
import { usePersistedState } from '@/plugins/usePersistedState';

const theme = {
    background: th`colors.black`.toString(),
    cursor: 'transparent',
    black: th`colors.black`.toString(),
    red: '#E54B4B',
    green: '#9ECE58',
    yellow: '#FAED70',
    blue: '#396FE2',
    magenta: '#BB80B3',
    cyan: '#2DDAFD',
    white: '#d0d0d0',
    brightBlack: 'rgba(255, 255, 255, 0.2)',
    brightRed: '#FF5370',
    brightGreen: '#C3E88D',
    brightYellow: '#FFCB6B',
    brightBlue: '#82AAFF',
    brightMagenta: '#C792EA',
    brightCyan: '#89DDFF',
    brightWhite: '#ffffff',
    selection: '#FAF089',
};

const terminalProps: ITerminalOptions = {
    disableStdin: true,
    cursorStyle: 'underline',
    allowTransparency: true,
    fontSize: 12,
    fontFamily: 'Menlo, Monaco, Consolas, monospace',
    rows: 30,
    theme: theme,
};

const TerminalDiv = styled.div`
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-thumb {
        ${tw`bg-neutral-900`};
    }
`;

export default () => {
    const TERMINAL_PRELUDE = '\u001b[1m\u001b[33mcontainer@pterodactyl~ \u001b[0m';
    const ref = useRef<HTMLDivElement>(null);
    const terminal = useMemo(() => new Terminal({ ...terminalProps }), []);
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const searchBar = new SearchBarAddon({ searchAddon });
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);
    const [ canSendCommands ] = usePermissions([ 'control.console' ]);
    const serverId = ServerContext.useStoreState(state => state.server.data!.id);
    const [ history, setHistory ] = usePersistedState<string[]>(`${serverId}:command_history`, []);
    const [ historyIndex, setHistoryIndex ] = useState(-1);

    const handleConsoleOutput = (line: string, prelude = false) => terminal.writeln(
        (prelude ? TERMINAL_PRELUDE : '') + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m',
    );

    const handleDaemonErrorOutput = (line: string) => terminal.writeln(
        TERMINAL_PRELUDE + '\u001b[1m\u001b[41m' + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m',
    );

    const handlePowerChangeEvent = (state: string) => terminal.writeln(
        TERMINAL_PRELUDE + 'Server marked as ' + state + '...\u001b[0m',
    );

    const handleCommandKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            const newIndex = Math.min(historyIndex + 1, history!.length - 1);

            setHistoryIndex(newIndex);
            e.currentTarget.value = history![newIndex] || '';
        }

        if (e.key === 'ArrowDown') {
            const newIndex = Math.max(historyIndex - 1, -1);

            setHistoryIndex(newIndex);
            e.currentTarget.value = history![newIndex] || '';
        }

        const command = e.currentTarget.value;
        if (e.key === 'Enter' && command.length > 0) {
            setHistory(prevHistory => [ command, ...prevHistory! ].slice(0, 32));
            setHistoryIndex(-1);

            instance && instance.send('send command', command);
            e.currentTarget.value = '';
        }
    };

    useEffect(() => {
        if (connected && ref.current && !terminal.element) {
            terminal.open(ref.current);
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(searchAddon);
            terminal.loadAddon(searchBar);
            fitAddon.fit();

            // Add support for capturing keys
            terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
            // Ctrl + C ( Copy )
                if (e.ctrlKey && e.key === 'c') {
                    document.execCommand('copy');
                    return false;
                }

                if (e.ctrlKey && e.key === 'f') {
                    searchBar.show();
                    return false;
                }

                if (e.key === 'Escape') {
                    searchBar.hidden();
                }
                return true;
            });
        }
    }, [ terminal, connected ]);

    const fit = debounce(() => {
        fitAddon.fit();
    }, 100);

    useEventListener('resize', () => fit());

    useEffect(() => {
        if (connected && instance) {
            terminal.clear();

            instance.addListener('status', handlePowerChangeEvent);
            instance.addListener('console output', handleConsoleOutput);
            instance.addListener('install output', handleConsoleOutput);
            instance.addListener('daemon message', line => handleConsoleOutput(line, true));
            instance.addListener('daemon error', handleDaemonErrorOutput);
            instance.send('send logs');
        }

        return () => {
            instance && instance.removeListener('console output', handleConsoleOutput)
                .removeListener('install output', handleConsoleOutput)
                .removeListener('daemon message', line => handleConsoleOutput(line, true))
                .removeListener('daemon error', handleDaemonErrorOutput)
                .removeListener('status', handlePowerChangeEvent);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ connected, instance ]);

    return (
        <div css={tw`text-xs font-mono relative`}>
            <SpinnerOverlay visible={!connected} size={'large'}/>
            <div
                css={[
                    tw`rounded-t p-2 bg-black w-full`,
                    !canSendCommands && tw`rounded-b`,
                ]}
                style={{
                    minHeight: '16rem',
                    maxHeight: '32rem',
                }}
            >
                <TerminalDiv id={'terminal'} ref={ref}/>
            </div>
            {canSendCommands &&
            <div css={tw`rounded-b bg-neutral-900 text-neutral-100 flex`}>
                <div css={tw`flex-shrink-0 p-2 font-bold`}>$</div>
                <div css={tw`w-full`}>
                    <input
                        type={'text'}
                        disabled={!instance || !connected}
                        css={tw`bg-transparent text-neutral-100 p-2 pl-0 w-full`}
                        onKeyDown={e => handleCommandKeydown(e)}
                    />
                </div>
            </div>
            }
        </div>
    );
};
