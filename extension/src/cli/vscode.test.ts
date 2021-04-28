import { Config } from '../Config'
import {
  applyExperimentFromQuickPick,
  branchExperimentFromQuickPick,
  experimentGcQuickPick,
  queueExperimentCommand,
  removeExperimentFromQuickPick
} from './vscode'
import { mocked } from 'ts-jest/utils'
import { runProcess } from '../processExecution'
import { getProcessEnv } from '../env'
import { QuickPickOptions, window } from 'vscode'
import { GcPreserveFlag } from './args'
import { QuickPickItemWithValue } from '../vscode/quickpick'

jest.mock('fs')
jest.mock('../processExecution')
jest.mock('../env')
jest.mock('vscode')

const mockedRunProcess = mocked(runProcess)
const mockedShowErrorMessage = mocked(window.showErrorMessage)
const mockedShowInformationMessage = mocked(window.showInformationMessage)
const mockedShowQuickPick = mocked<
  (
    items: QuickPickItemWithValue[],
    options: QuickPickOptions
  ) => Thenable<
    QuickPickItemWithValue[] | QuickPickItemWithValue | string | undefined
  >
>(window.showQuickPick)
const mockedShowInputBox = mocked(window.showInputBox)
const mockedGetProcessEnv = mocked(getProcessEnv)
const mockedEnv = {
  PATH: '/all/of/the/goodies:/in/my/path'
}

beforeEach(() => {
  jest.resetAllMocks()
  mockedGetProcessEnv.mockReturnValue(mockedEnv)
})

const exampleConfig = {
  dvcPath: 'dvc',
  workspaceRoot: '/home/user/project'
} as Config

const exampleExperimentsList = [
  'exp-0580a',
  'exp-c54c4',
  'exp-054f1',
  'exp-ae4fa',
  'exp-1324e',
  'exp-3bd24',
  'exp-5d170',
  'exp-9fe22',
  'exp-b707b',
  'exp-47694',
  'exp-59807'
]

const exampleExpName = 'exp-2021'

const exampleListStdout = exampleExperimentsList.join('\n') + '\n'

describe('queueExperimentCommand', () => {
  it('displays an info message with the contents of stdout when the command succeeds', async () => {
    const stdout = 'Example stdout that will be resolved literally'
    mockedRunProcess.mockResolvedValue(stdout)
    await queueExperimentCommand(exampleConfig)
    expect(mockedShowInformationMessage).toBeCalledWith(stdout)
  })

  it('displays an error message with the contents of stderr when the command fails', async () => {
    const stderr = 'Example stderr that will be resolved literally'
    mockedRunProcess.mockRejectedValue(stderr)
    await queueExperimentCommand(exampleConfig)
    expect(mockedShowErrorMessage).toBeCalledWith(stderr)
  })
})

describe('experimentGcCommand', () => {
  it('invokes a QuickPick with the correct options', async () => {
    await experimentGcQuickPick(exampleConfig)
    expect(mockedShowQuickPick).toBeCalledWith(
      [
        {
          detail: 'Preserve Experiments derived from all Git branches',
          label: 'All Branches',
          value: '--all-branches'
        },
        {
          detail: 'Preserve Experiments derived from all Git tags',
          label: 'All Tags',
          value: '--all-tags'
        },
        {
          detail: 'Preserve Experiments derived from all Git commits',
          label: 'All Commits',
          value: '--all-commits'
        },
        {
          detail: 'Preserve all queued Experiments',
          label: 'Queued Experiments',
          value: '--queued'
        }
      ],
      {
        canPickMany: true,
        placeHolder: 'Select which Experiments to preserve'
      }
    )
  })

  it('executes the proper command given a mocked selection', async () => {
    mockedRunProcess.mockResolvedValue('')
    mockedShowQuickPick.mockResolvedValue([
      {
        detail: 'Preserve Experiments derived from all Git tags',
        value: GcPreserveFlag.ALL_TAGS,
        label: 'All Tags'
      },
      {
        detail: 'Preserve Experiments derived from all Git commits',
        value: GcPreserveFlag.ALL_COMMITS,
        label: 'All Commits'
      }
    ])

    await experimentGcQuickPick(exampleConfig)

    expect(mockedRunProcess).toBeCalledWith({
      executable: 'dvc',
      args: ['exp', 'gc', '-f', '-w', '--all-tags', '--all-commits'],
      cwd: exampleConfig.workspaceRoot,
      env: mockedEnv
    })
  })

  it('reports stdout from the executed command via showInformationMessage', async () => {
    const stdout = 'example stdout that will be passed on'
    mockedShowQuickPick.mockResolvedValue([])
    mockedRunProcess.mockResolvedValue(stdout)
    await experimentGcQuickPick(exampleConfig)
    expect(mockedShowInformationMessage).toBeCalledWith(stdout)
  })

  it('reports stderr from the executed command via showInformationMessage', async () => {
    const stderr = 'example stderr that will be passed on'
    mockedShowQuickPick.mockResolvedValue([])
    mockedRunProcess.mockRejectedValue(stderr)
    await experimentGcQuickPick(exampleConfig)
    expect(mockedShowErrorMessage).toBeCalledWith(stderr)
  })

  it('throws from a non-shell Exception', async () => {
    mockedShowQuickPick.mockResolvedValue([])
    mockedRunProcess.mockRejectedValue('')
    await expect(experimentGcQuickPick(exampleConfig)).rejects.toThrow()
    expect(mockedShowErrorMessage).not.toBeCalled()
  })

  it('executes the proper default command given no selections', async () => {
    mockedRunProcess.mockResolvedValue('')
    mockedShowQuickPick.mockResolvedValue([])

    await experimentGcQuickPick(exampleConfig)

    expect(mockedRunProcess).toBeCalledWith({
      executable: 'dvc',
      args: ['exp', 'gc', '-f', '-w'],
      cwd: exampleConfig.workspaceRoot,
      env: mockedEnv
    })
  })

  it('does not execute a command if the QuickPick is dismissed', async () => {
    mockedShowQuickPick.mockResolvedValue(undefined)
    await experimentGcQuickPick(exampleConfig)
    expect(mockedRunProcess).not.toBeCalled()
  })
})

describe('experimentsQuickPickCommand and applyExperimentFromQuickPick', () => {
  it('invokes a quickpick with a list of names from stdout and executes a constructed command', async () => {
    mockedRunProcess.mockResolvedValue('output from apply')
    mockedRunProcess.mockResolvedValueOnce(exampleListStdout)
    mockedShowQuickPick.mockResolvedValue(exampleExpName)
    await applyExperimentFromQuickPick(exampleConfig)
    expect(mockedShowQuickPick).toBeCalledWith(exampleExperimentsList)

    expect(mockedRunProcess).toBeCalledWith({
      executable: 'dvc',
      args: ['exp', 'list', '--names-only'],
      cwd: '/home/user/project',
      env: mockedEnv
    })

    expect(mockedRunProcess).toBeCalledWith({
      executable: 'dvc',
      args: ['exp', 'apply', 'exp-2021'],
      cwd: '/home/user/project',
      env: mockedEnv
    })
  })

  it('throws from a non-shell Exception', async () => {
    mockedShowQuickPick.mockResolvedValue([])
    mockedRunProcess.mockRejectedValue('')
    await expect(applyExperimentFromQuickPick(exampleConfig)).rejects.toThrow()
    expect(mockedShowErrorMessage).not.toBeCalled()
  })

  it('displays an error message when there are no experiments to select', async () => {
    mockedRunProcess.mockResolvedValue('output from apply')
    mockedRunProcess.mockResolvedValueOnce('')
    mockedShowQuickPick.mockResolvedValue(exampleExpName)
    await applyExperimentFromQuickPick(exampleConfig)
    expect(mockedShowQuickPick).not.toBeCalled()
    expect(mockedShowErrorMessage).toBeCalledWith(
      'There are no experiments to select!'
    )
  })

  it('does not execute a command if the QuickPick is dismissed', async () => {
    mockedShowQuickPick.mockResolvedValue(undefined)
    mockedRunProcess.mockResolvedValueOnce(exampleListStdout)
    await applyExperimentFromQuickPick(exampleConfig)
    expect(mockedRunProcess).toBeCalledTimes(1)
  })
})

describe('removeExperimentFromQuickPick', () => {
  it('executes a constructed command', async () => {
    mockedRunProcess.mockResolvedValueOnce(exampleListStdout)
    mockedRunProcess.mockResolvedValueOnce('output from remove')
    mockedShowQuickPick.mockResolvedValue(exampleExpName)
    await removeExperimentFromQuickPick(exampleConfig)

    expect(mockedShowInformationMessage).toBeCalledWith(
      'Experiment exp-2021 has been removed!'
    )
    expect(mockedRunProcess).toBeCalledWith({
      executable: 'dvc',
      args: ['exp', 'remove', 'exp-2021'],
      cwd: '/home/user/project',
      env: mockedEnv
    })
  })
})

describe('branchExperimentFromQuickPick', () => {
  const testBranchName = 'test-branch-name'

  it('gets a name from showInputBox and executes a constructed command', async () => {
    mockedRunProcess.mockResolvedValueOnce(exampleListStdout)
    mockedRunProcess.mockResolvedValueOnce('output from branch')
    mockedShowQuickPick.mockResolvedValue(exampleExpName)
    mockedShowInputBox.mockResolvedValue(testBranchName)

    await branchExperimentFromQuickPick(exampleConfig)

    expect(mockedShowQuickPick).toBeCalledWith(exampleExperimentsList)
    expect(mockedRunProcess).toBeCalledWith({
      executable: 'dvc',
      args: ['exp', 'branch', 'exp-2021', 'test-branch-name'],
      cwd: '/home/user/project',
      env: mockedEnv
    })
  })

  it('does not execute a command if the InputBox is dismissed', async () => {
    mockedShowQuickPick.mockResolvedValue(undefined)
    mockedRunProcess.mockResolvedValueOnce(exampleListStdout)
    mockedShowQuickPick.mockResolvedValue(exampleExpName)
    mockedShowInputBox.mockResolvedValue(undefined)
    mockedRunProcess.mockResolvedValueOnce('output from branch')

    await branchExperimentFromQuickPick(exampleConfig)
    expect(mockedRunProcess).toBeCalledTimes(1)
  })
})
