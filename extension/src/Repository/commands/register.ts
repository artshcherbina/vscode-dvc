import { Disposable } from '@hediet/std/disposable'
import { Config } from '../../Config'
import { CliExecutor, commitTarget } from '../../cli/executor'
import {
  registerResourceUriCommand,
  registerResourceUriCommand_,
  registerRootUriCommand
} from '../../vscode/commands'

export const registerRepositoryCommands = (
  config: Config,
  cliExecutor: CliExecutor
) => {
  const disposer = Disposable.fn()

  disposer.track(
    registerResourceUriCommand_('dvc.addTarget', cliExecutor.addTarget)
  )

  disposer.track(registerRootUriCommand('dvc.checkout', cliExecutor.checkout))

  disposer.track(
    registerResourceUriCommand_(
      'dvc.checkoutTarget',
      cliExecutor.checkoutTarget
    )
  )

  disposer.track(registerRootUriCommand('dvc.commit', cliExecutor.commit))

  disposer.track(
    registerResourceUriCommand(config, 'dvc.commitTarget', commitTarget)
  )

  disposer.track(
    disposer.track(registerRootUriCommand('dvc.pull', cliExecutor.pull))
  )

  disposer.track(registerRootUriCommand('dvc.push', cliExecutor.push))

  return disposer
}
