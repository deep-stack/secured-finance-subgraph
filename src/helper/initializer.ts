import { BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import {
    DailyVolume,
    LendingMarket,
    Protocol,
    User,
} from '../../generated/schema';
import { getDailyVolumeEntityId } from '../utils/id-generation';
import { buildLendingMarketId } from '../utils/string';

export const PROTOCOL_ID = 'ethereum';

export const getProtocol = (): Protocol => {
    let protocol = Protocol.load(PROTOCOL_ID);
    if (protocol == null) {
        protocol = new Protocol(PROTOCOL_ID);
        protocol.totalUsers = BigInt.fromI32(0);
        protocol.save();
    }
    return protocol as Protocol;
};

export const getOrInitUser = (address: Bytes): User => {
    let user = User.load(address.toHexString());
    if (user === null) {
        user = new User(address.toHexString());
        user.save();

        // Add user to protocol
        const protocol = getProtocol();
        protocol.totalUsers = protocol.totalUsers.plus(BigInt.fromI32(1));
        protocol.save();
    }
    return user as User;
};

export const getOrInitDailyVolume = (
    ccy: Bytes,
    maturity: BigInt,
    date: BigInt
): DailyVolume => {
    const utcDate = new Date(date.times(BigInt.fromI32(1000)).toI64());
    const dayStr = utcDate.toISOString().substring(0, 10); //yyyy-mm-dd

    let id = getDailyVolumeEntityId(ccy, maturity, dayStr);
    let dailyVolume = DailyVolume.load(id);
    if (dailyVolume === null) {
        dailyVolume = new DailyVolume(id);
        dailyVolume.currency = ccy;
        dailyVolume.maturity = maturity;
        dailyVolume.day = dayStr;
        dailyVolume.timestamp = BigInt.fromI64(
            Date.parse(dayStr).getTime() / 1000
        );
        dailyVolume.volume = BigInt.fromI32(0);
        dailyVolume.save();
    }
    return dailyVolume as DailyVolume;
};

export const getOrInitLendingMarket = (
    ccy: Bytes,
    maturity: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    txHash: Bytes
): LendingMarket => {
    const id = buildLendingMarketId(ccy, maturity);
    let lendingMarket = LendingMarket.load(id);
    if (lendingMarket == null) {
        lendingMarket = new LendingMarket(id);
        lendingMarket.currency = ccy;
        lendingMarket.maturity = maturity;
        lendingMarket.isActive = true;
        lendingMarket.protocol = getProtocol().id;
        lendingMarket.volume = BigInt.fromI32(0);

        lendingMarket.createdAt = timestamp;
        lendingMarket.blockNumber = blockNumber;
        lendingMarket.txHash = txHash;

        // Initialize empty array
        lendingMarket.transactions = [];

        lendingMarket.save();
        log.debug('Created lending market for currency: {}, maturity: {}', [
            ccy.toString(),
            maturity.toString(),
        ]);
    }
    return lendingMarket as LendingMarket;
};
