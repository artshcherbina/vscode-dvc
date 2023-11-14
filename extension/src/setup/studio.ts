import { Event, EventEmitter } from 'vscode'
import fetch from 'node-fetch'
import { STUDIO_URL } from './webview/contract'
import { AvailableCommands, InternalCommands } from '../commands/internal'
import { getFirstWorkspaceFolder } from '../vscode/workspaceFolders'
import { Args, ConfigKey, Flag } from '../cli/dvc/constants'
import { ContextKey, setContextValue } from '../vscode/context'
import { Disposable } from '../class/dispose'
import { getCallBackUrl, openUrl, waitForUriResponse } from '../vscode/external'
import { Modal } from '../vscode/modal'

export const isStudioAccessToken = (text?: string): boolean => {
  if (!text) {
    return false
  }
  return text.startsWith('isat_') && text.length >= 53
}

export class Studio extends Disposable {
  public readonly onDidChangeStudioConnection: Event<void>
  private readonly studioConnectionChanged: EventEmitter<void> =
    this.dispose.track(new EventEmitter())

  private readonly getCwd: () => string | undefined
  private readonly internalCommands: InternalCommands
  private studioAccessToken: string | undefined = undefined
  private studioIsConnected = false
  private shareLiveToStudio: boolean | undefined = undefined

  constructor(
    internalCommands: InternalCommands,
    getCwd: () => string | undefined
  ) {
    super()

    this.internalCommands = internalCommands
    this.getCwd = getCwd
    this.onDidChangeStudioConnection = this.studioConnectionChanged.event
  }

  public getStudioAccessToken() {
    return this.studioAccessToken
  }

  public getStudioIsConnected() {
    return this.studioIsConnected
  }

  public getShareLiveToStudio() {
    return this.shareLiveToStudio
  }

  public async removeStudioAccessToken(dvcRoots: string[]) {
    if (dvcRoots.length !== 1) {
      const cwd = getFirstWorkspaceFolder()
      if (!cwd) {
        return
      }

      return await this.accessConfig(
        cwd,
        Flag.GLOBAL,
        Flag.UNSET,
        ConfigKey.STUDIO_TOKEN
      )
    }

    const cwd = dvcRoots[0]

    await this.accessConfig(cwd, Flag.LOCAL, Flag.UNSET, ConfigKey.STUDIO_TOKEN)

    return await this.accessConfig(
      cwd,
      Flag.GLOBAL,
      Flag.UNSET,
      ConfigKey.STUDIO_TOKEN
    )
  }

  public saveStudioAccessTokenInConfig(cwd: string, token: string) {
    return this.accessConfig(cwd, Flag.GLOBAL, ConfigKey.STUDIO_TOKEN, token)
  }

  public async updateIsStudioConnected() {
    await this.setStudioValues()
    const storedToken = this.getStudioAccessToken()
    const isConnected = isStudioAccessToken(storedToken)
    this.studioIsConnected = isConnected
    return setContextValue(ContextKey.STUDIO_CONNECTED, isConnected)
  }

  public async updateStudioOffline(shareLive: boolean) {
    const offline = !shareLive

    const cwd = this.getCwd()

    if (!cwd) {
      return
    }

    await this.accessConfig(
      cwd,
      Flag.GLOBAL,
      ConfigKey.STUDIO_OFFLINE,
      String(offline)
    )
  }

  public async requestStudioTokenAuthentication() {
    const response = await this.fetchFromStudio(
      `${STUDIO_URL}/api/device-login`,
      {
        client_name: 'VS Code'
      }
    )

    const {
      token_uri: tokenUri,
      verification_uri: verificationUri,
      user_code: userCode,
      device_code: deviceCode
    } = (await response.json()) as {
      token_uri: string
      verification_uri: string
      user_code: string
      device_code: string
    }

    const callbackUrl = await getCallBackUrl('/studio-complete-auth')
    const verificationUrlWithParams = new URL(verificationUri)

    verificationUrlWithParams.searchParams.append('redirect_uri', callbackUrl)
    verificationUrlWithParams.searchParams.append('code', userCode)

    await openUrl(verificationUrlWithParams.toString())
    void waitForUriResponse('/studio-complete-auth', () => {
      void this.requestStudioToken(deviceCode, tokenUri)
    })
  }

  private fetchFromStudio(reqUri: string, body: Record<string, unknown>) {
    return fetch(reqUri, {
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    })
  }

  private async fetchStudioToken(deviceCode: string, tokenUri: string) {
    const response = await this.fetchFromStudio(tokenUri, {
      code: deviceCode
    })

    if (response.status !== 200) {
      const { detail } = (await response.json()) as {
        detail: string
      }
      return Modal.errorWithOptions(
        `Unable to get token. Failed with "${detail}"`
      )
    }

    const { access_token: accessToken } = (await response.json()) as {
      access_token: string
    }

    return accessToken
  }

  private async requestStudioToken(deviceCode: string, tokenUri: string) {
    const token = await this.fetchStudioToken(deviceCode, tokenUri)
    const cwd = this.getCwd()

    if (!token || !cwd) {
      return
    }

    return this.saveStudioAccessTokenInConfig(cwd, token)
  }

  private async setStudioValues() {
    const cwd = this.getCwd()

    const previousStudioAccessToken = this.studioAccessToken

    if (!cwd) {
      this.studioAccessToken = undefined
      this.shareLiveToStudio = undefined

      if (previousStudioAccessToken) {
        this.studioConnectionChanged.fire()
      }
      return
    }

    const [studioAccessToken, shareLiveToStudio] = await Promise.all([
      this.accessConfig(cwd, ConfigKey.STUDIO_TOKEN),
      (await this.accessConfig(cwd, ConfigKey.STUDIO_OFFLINE)) !== 'true'
    ])

    this.studioAccessToken = studioAccessToken
    this.shareLiveToStudio = shareLiveToStudio

    if (previousStudioAccessToken !== this.studioAccessToken) {
      this.studioConnectionChanged.fire()
    }
  }

  private accessConfig(cwd: string, ...args: Args) {
    return this.internalCommands.executeCommand(
      AvailableCommands.CONFIG,
      cwd,
      ...args
    )
  }
}