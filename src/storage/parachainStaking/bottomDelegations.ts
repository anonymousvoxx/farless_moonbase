import { UnknownVersionError } from '../../common/errors'
import { decodeId, encodeId } from '../../common/helpers'
import { ParachainStakingBottomDelegationsStorage } from '../../types/generated/storage'
import { StorageContext } from '../../types/generated/support'

interface StorageData {
    delegations: {
        owner: Uint8Array
        amount: bigint
    }[]
    total: bigint
}

async function getStorageData(ctx: StorageContext, account: Uint8Array): Promise<StorageData | undefined> {
    const storage = new ParachainStakingBottomDelegationsStorage(ctx)
    if (!storage.isExists) return undefined

    if (storage.isV1201) {
        return await storage.getAsV1201(account)
    } else {
        throw new UnknownVersionError(storage.constructor.name)
    }
}

const storageCache: {
    hash?: string
    values: Map<string, BottomDelegations>
} = {
    values: new Map(),
}

interface BottomDelegations {
    delegations: {
        id: string
        amount: bigint
    }[]
    total: bigint
}

export async function getBottomDelegations(
    ctx: StorageContext,
    account: string
): Promise<BottomDelegations | undefined> {
    if (storageCache.hash !== ctx.block.hash) {
        storageCache.hash = ctx.block.hash
        storageCache.values.clear()
    }

    const key = account
    let value = storageCache.values.get(account)

    if (!value) {
        const u8 = decodeId(account)

        const data = await getStorageData(ctx, u8)
        if (!data) return undefined

        value = {
            delegations: data.delegations.map((delegation) => ({
                id: encodeId(delegation.owner),
                amount: delegation.amount,
            })),
            total: data.total,
        }

        storageCache.values.set(key, value)
    }

    return value
}