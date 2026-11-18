import { executeRPCCommand } from '@pairdraw/core/rpc'

import { isAppMode, requireFile, rpc } from '#cli/app/client'
import { appTargetRPCArgs, type AppTargetCLIArgs } from '#cli/app/target'
import { loadDocument, populateWholeDocument, prepareDocumentForRPC } from '#cli/headless'

type RPCArgs = { [key: string]: unknown }

function isRPCArgs(value: unknown): value is RPCArgs {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export async function loadRPCData<Result>(
  file: string | undefined,
  command: string,
  args?: unknown,
  targetArgs?: AppTargetCLIArgs
): Promise<Result> {
  if (isAppMode(file)) {
    const rpcArgs: RPCArgs = isRPCArgs(args) ? { ...args } : {}
    if (targetArgs) Object.assign(rpcArgs, appTargetRPCArgs(targetArgs))
    return rpc<Result>(command, rpcArgs)
  }
  const graph = await loadDocument(requireFile(file))
  prepareDocumentForRPC(graph, command, args)
  // A file loads its pages lazily and `pages` counts each page's layers, so load them first.
  if (command === 'pages') populateWholeDocument(graph)
  return executeRPCCommand(graph, command, args) as Result
}
