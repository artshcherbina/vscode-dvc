import { join } from 'path'
import { getCommandString } from './command'
import { Command, Flag } from './args'

describe('getCommandString', () => {
  it('should give the correct command string given a basic environment', () => {
    const commandString = getCommandString(
      undefined,
      'dvc',
      Command.CHECKOUT,
      Flag.FORCE
    )
    expect(commandString).toEqual('dvc checkout -f')
  })

  it('should give the correct command string given an environment which uses an isolated python env', () => {
    const pythonBinPath = join('path', 'to', 'python', '.venv')
    const commandString = getCommandString(pythonBinPath, 'dvc', Command.DIFF)
    expect(commandString).toEqual(`${join(pythonBinPath, 'python')} dvc diff`)
  })

  it('should give the correct command string given an environment which uses an isolated python env and a direct path to dvc', () => {
    const pythonBinPath = join('path', 'to', 'conda', '.venv')
    const cliPath = join('custom', 'path', 'to', 'dvc')
    const commandString = getCommandString(pythonBinPath, cliPath, Command.PUSH)
    expect(commandString).toEqual(
      `${join(pythonBinPath, 'python')} ${cliPath} push`
    )
  })
})
