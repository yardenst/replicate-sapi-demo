import fetchIntercept from 'fetch-intercept';


const decodeHost = (input: string): string => {
    const host = input.split(".")[0].replace(/--/g, "@@@@@@");
    const parts = host.split("-");
    parts.pop();
    return parts.join(".").replace(/@@@@@@/g, "-");
};

const SAPI_BASE_URL = 'https://dev-api.usesapi.com/'
// dev https://dev-api.usesapi.com/
// prod https://api.usesapi.com/
const SAPI_PROXY_HOST = 'dev-proxy.usesapi.com'

interface SapiCreateTokenResponse {
    token: string,
    expiresAt: string
}

export class SapiProxy {
    private readonly proxyId: string | null = null
    private readonly proxyHost: string | null = null
    private readonly tokenOwner
    private readonly platform
    private expirationThresholdMs = 60 * 1000

    constructor({
                    proxyId,
                    tokenOwner = 'anno-user',
                    platform = 'app'
                }: { proxyId: string, tokenOwner?: string, platform?: string }) {
        this.proxyId = proxyId
        this.proxyHost = `${proxyId}.${SAPI_PROXY_HOST}`
        this.tokenOwner = tokenOwner
        this.platform = platform
    }


    init() {
        if (this.isLocalTokenExpired()) {
            this.refreshToken().catch(console.error)
        } else {
            const data = this.getLocalSapiTokenData()!
            const toms = new Date(data.expiresAt).getTime() - Date.now() - this.expirationThresholdMs
            setTimeout(() => {
                this.refreshToken().catch(console.error)
            }, toms)
        }

        this.registerFetchIntercept()
    }

    private getStorageKey = () => {
        return `__sapi_token_${this.proxyHost}`
    }


    private registerFetchIntercept = () => {
        fetchIntercept.register({
            request: (url, config) => {
                console.log('checking request')
                const originalHost = decodeHost(new URL(url).host)
                if (!url.includes(originalHost)) {
                    return [url, config]
                }
                console.log('host is replicate.. intercepting')

                const proxyUrl = new URL(url)
                proxyUrl.host = this.proxyHost!
                const headers = {
                    ...(config.headers || {}),
                    Authorization: `Bearer ${this.getLocalSapiTokenData()!.token}`
                }

                console.log(`new url is ${proxyUrl.toString()}`)
                console.log(`new headers `, headers)

                return [proxyUrl.toString(), {
                    ...config,
                    headers
                }];
            }
        });
    }

    private refreshToken = async () => {
        console.log('refreshong sapi token')
        try {
            const data = await this.getSapiToken()
            this.setLocalSapiTokenData(data)
            console.log('refreshong sapi token done')
            const toms = new Date(data.expiresAt).getTime() - Date.now() - this.expirationThresholdMs

            setTimeout(() => {
                this.refreshToken()
            }, toms)
        } catch (e) {
            console.error(e);
        }
    }


    private getSapiToken = async () => {
        const res = await fetch(`${SAPI_BASE_URL}v1/token?code=${this.proxyId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                tokenOwner: this.tokenOwner,
                metadata: {
                    platform: this.platform
                },
            }),
        });
        if (res.status >= 400) {
            throw new Error('Error while trying to create a Sapi token.')
        }
        const json = await res.json();
        const token = json['token'];
        const expiresAt = json['expiresAt'];
        return {token, expiresAt}
    }

    private getLocalSapiTokenData = (): SapiCreateTokenResponse | null => {
        const localData = localStorage.getItem(this.getStorageKey())
        if (!localData) {
            return null
        }
        return JSON.parse(localData)
    }
    private setLocalSapiTokenData = (data: SapiCreateTokenResponse) => localStorage.setItem(this.getStorageKey(), JSON.stringify(data))
    private isLocalTokenExpired = () => {
        const localData = this.getLocalSapiTokenData()
        if (!localData) {
            return true
        }
        console.log(localData.expiresAt, new Date().toISOString())
        return localData.expiresAt < new Date(Date.now() + this.expirationThresholdMs).toISOString()
    }

}
