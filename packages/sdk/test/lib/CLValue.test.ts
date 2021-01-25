import { expect } from 'chai';
import {
  AccountHash,
  CLTypedAndToBytesHelper,
  CLValue,
  KeyValue,
  URef,
  CLTypeHelper
} from '../../src';
import { TypedJSON } from 'typedjson';
import { BigNumber } from '@ethersproject/bignumber';

const clValueSerializer = new TypedJSON(CLValue);

const jsonRoundTrip = (value: CLValue, expectJSON: any) => {
  const toJSON = clValueSerializer.stringify(value);
  expect(toJSON).to.deep.equal(JSON.stringify(expectJSON));
  const clValue = clValueSerializer.parse(toJSON);
  expect(clValue?.toBytes()).to.deep.equal(value.toBytes());
};

describe('CLValue', () => {
  it('should be able to serialize/deserialize bool', () => {
    const b = CLValue.bool(true);
    jsonRoundTrip(b, { cl_type: 'Bool', bytes: '01' });
    expect(b.asBoolean()).to.deep.eq(true);

    const b2 = CLValue.bool(false);
    jsonRoundTrip(b2, { cl_type: 'Bool', bytes: '00' });
    expect(b2.asBoolean()).to.deep.eq(false);
  });

  it('should be able to serialize/deserialize u8', () => {
    const u8 = CLValue.u8(10);
    jsonRoundTrip(u8, { cl_type: 'U8', bytes: '0a' });
    expect(u8.asBigNumber()).to.deep.equal(BigNumber.from(10));
  });

  it('should be able to serialize/deserialize u32', () => {
    const u32 = CLValue.u32(0);
    jsonRoundTrip(u32, { cl_type: 'U32', bytes: '00000000' });
    expect(u32.asBigNumber().toNumber()).to.equal(0);

    const u32MaxValue = CLValue.u32(0xffffffff);
    jsonRoundTrip(u32MaxValue, { cl_type: 'U32', bytes: 'ffffffff' });
    expect(u32MaxValue.asBigNumber().toNumber()).to.equal(4294967295);
  });

  it('should be able to serialize/deserialize i32', () => {
    const i32MinValue = CLValue.i32(-2147483648);
    jsonRoundTrip(i32MinValue, { cl_type: 'I32', bytes: '00000080' });
    expect(i32MinValue.asBigNumber().toNumber()).to.equal(-2147483648);

    const i32MaxValue = CLValue.i32(2147483647);
    jsonRoundTrip(i32MaxValue, { cl_type: 'I32', bytes: 'ffffff7f' });
    expect(i32MaxValue.asBigNumber().toNumber()).to.equal(2147483647);
  });

  it('should be able to serialize/deserialize i64', () => {
    const i64Min = BigNumber.from('-9223372036854775808');
    const i64MinValue = CLValue.i64(i64Min);
    jsonRoundTrip(i64MinValue, { cl_type: 'I64', bytes: '0000000000000080' });
    expect(i64MinValue.asBigNumber()).to.deep.equal(i64Min);

    const i64Zero = 0;
    const i64ZeroValue = CLValue.i64(i64Zero);
    jsonRoundTrip(i64ZeroValue, { cl_type: 'I64', bytes: '0000000000000000' });
    expect(i64ZeroValue.asBigNumber().toNumber()).to.deep.equal(i64Zero);

    const i64Max = BigNumber.from('9223372036854775807');
    const i64MaxValue = CLValue.i64(i64Max);
    jsonRoundTrip(i64MaxValue, { cl_type: 'I64', bytes: 'ffffffffffffff7f' });
    expect(i64MaxValue.asBigNumber()).to.deep.equal(i64Max);
  });

  it('should be able to serialize/deserialize u64', () => {
    const u64ZeroValue = CLValue.u64(0);
    jsonRoundTrip(u64ZeroValue, { cl_type: 'U64', bytes: '0000000000000000' });
    expect(u64ZeroValue.asBigNumber().toNumber()).to.deep.eq(0);

    const u64MaxValue = CLValue.u64(BigNumber.from('18446744073709551615'));
    jsonRoundTrip(u64MaxValue, { cl_type: 'U64', bytes: 'ffffffffffffffff' });
    expect(u64MaxValue.asBigNumber()).to.deep.eq(
      BigNumber.from('18446744073709551615')
    );
  });

  it('should be able to serialize/deserialize u128', () => {
    const u128Zero = CLValue.u128(0);
    jsonRoundTrip(u128Zero, { cl_type: 'U128', bytes: '00' });
    expect(u128Zero.asBigNumber()).to.deep.equal(BigNumber.from(0));

    const u128_1 = CLValue.u128(1);
    jsonRoundTrip(u128_1, { cl_type: 'U128', bytes: '0101' });
    expect(u128_1.asBigNumber()).to.deep.equal(BigNumber.from(1));

    const u128_16 = CLValue.u128(16);
    jsonRoundTrip(u128_16, { cl_type: 'U128', bytes: '0110' });
    expect(u128_16.asBigNumber()).to.deep.equal(BigNumber.from(16));

    const u128_256 = CLValue.u128(256);
    jsonRoundTrip(u128_256, { cl_type: 'U128', bytes: '020001' });
    expect(u128_256.asBigNumber()).to.deep.equal(BigNumber.from(256));

    const u128MaxValue = CLValue.u128(
      BigNumber.from('340282366920938463463374607431768211455')
    );
    jsonRoundTrip(u128MaxValue, {
      cl_type: 'U128',
      bytes: '10ffffffffffffffffffffffffffffffff'
    });
    expect(u128MaxValue.asBigNumber()).to.deep.equal(
      BigNumber.from('340282366920938463463374607431768211455')
    );
  });

  it('should be able to serialize/deserialize u256', () => {
    const u256Zero = CLValue.u256(0);
    jsonRoundTrip(u256Zero, { cl_type: 'U256', bytes: '00' });
    expect(u256Zero.asBigNumber()).to.deep.equal(BigNumber.from(0));

    const u256_1 = CLValue.u256(1);
    jsonRoundTrip(u256_1, { cl_type: 'U256', bytes: '0101' });
    expect(u256_1.asBigNumber()).to.deep.equal(BigNumber.from(1));

    const u256_16 = CLValue.u256(16);
    jsonRoundTrip(u256_16, { cl_type: 'U256', bytes: '0110' });
    expect(u256_16.asBigNumber()).to.deep.equal(BigNumber.from(16));

    const u256_256 = CLValue.u256(256);
    jsonRoundTrip(u256_256, { cl_type: 'U256', bytes: '020001' });
    expect(u256_256.asBigNumber()).to.deep.equal(BigNumber.from(256));

    const u256MaxValue = CLValue.u256(
      BigNumber.from(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      )
    );
    jsonRoundTrip(u256MaxValue, {
      cl_type: 'U256',
      bytes:
        '20ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    });
    expect(u256MaxValue.asBigNumber()).to.deep.equal(
      BigNumber.from(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      )
    );
  });

  it('should be able to serialize/deserialize unit', () => {
    const unit = CLValue.unit();
    jsonRoundTrip(unit, { cl_type: 'Unit', bytes: '' });
  });

  it('should be able to serialize/deserialize utf8 string', () => {
    const stringValue = CLValue.string('');
    jsonRoundTrip(stringValue, { cl_type: 'String', bytes: '00000000' });
    expect(stringValue.asString()).to.deep.eq('');
  });

  it('should serialize/deserialize variants of Key correctly', () => {
    const keyAccount = CLValue.key(
      KeyValue.fromAccount(new AccountHash(Uint8Array.from(Array(32).fill(1))))
    );
    jsonRoundTrip(keyAccount, {
      cl_type: 'Key',
      bytes:
        '000101010101010101010101010101010101010101010101010101010101010101'
    });

    const keyHash = CLValue.key(
      KeyValue.fromHash(Uint8Array.from(Array(32).fill(2)))
    );
    jsonRoundTrip(keyHash, {
      cl_type: 'Key',
      bytes:
        '010202020202020202020202020202020202020202020202020202020202020202'
    });

    const keyURef = CLValue.key(
      KeyValue.fromURef(
        URef.fromFormattedStr(
          'uref-0303030303030303030303030303030303030303030303030303030303030303-001'
        )
      )
    );
    jsonRoundTrip(keyURef, {
      cl_type: 'Key',
      bytes:
        '02030303030303030303030303030303030303030303030303030303030303030301'
    });
  });

  it('should serialize/deserialize URef correctly', () => {
    const uref = URef.fromFormattedStr(
      'uref-0606060606060606060606060606060606060606060606060606060606060606-007'
    );
    const urefValue = CLValue.uref(uref);
    jsonRoundTrip(urefValue, {
      cl_type: 'URef',
      bytes:
        '060606060606060606060606060606060606060606060606060606060606060607'
    });
  });

  it('should serialize/deserialize Tuple1 correctly', () => {
    const tuple1 = CLValue.tuple1(CLTypedAndToBytesHelper.bool(true));
    jsonRoundTrip(tuple1, { cl_type: { Tuple1: ['Bool'] }, bytes: '01' });

    const tuple2 = CLValue.tuple1(
      CLTypedAndToBytesHelper.tuple1(CLTypedAndToBytesHelper.bool(true))
    );
    jsonRoundTrip(tuple2, {
      cl_type: { Tuple1: [{ Tuple1: ['Bool'] }] },
      bytes: '01'
    });
  });

  it('should serialize/deserialize Tuple2 correctly', () => {
    const innerTuple1 = CLTypedAndToBytesHelper.tuple1(
      CLTypedAndToBytesHelper.bool(true)
    );
    const tuple2 = CLValue.tuple2(
      CLTypedAndToBytesHelper.u128(128),
      innerTuple1
    );
    jsonRoundTrip(tuple2, {
      cl_type: { Tuple2: ['U128', { Tuple1: ['Bool'] }] },
      bytes: '018001'
    });
  });

  it('should serialize/deserialize Tuple3 correctly', () => {
    const value1 = CLTypedAndToBytesHelper.string('hello');
    const value2 = CLTypedAndToBytesHelper.u64(123456);
    const value3 = CLTypedAndToBytesHelper.bool(true);
    const tuple3 = CLTypedAndToBytesHelper.tuple3(value1, value2, value3);
    jsonRoundTrip(CLValue.fromT(tuple3), {
      cl_type: { Tuple3: ['String', 'U64', 'Bool'] },
      bytes: '0500000068656c6c6f40e201000000000001'
    });

    const composedTuple3 = CLTypedAndToBytesHelper.tuple3(
      tuple3,
      tuple3,
      tuple3
    );

    jsonRoundTrip(CLValue.fromT(composedTuple3), {
      cl_type: {
        Tuple3: [
          { Tuple3: ['String', 'U64', 'Bool'] },
          { Tuple3: ['String', 'U64', 'Bool'] },
          { Tuple3: ['String', 'U64', 'Bool'] }
        ]
      },
      bytes:
        '0500000068656c6c6f40e2010000000000010500000068656c6c6f40e2010000000000010500000068656c6c6f40e201000000000001'
    });
  });

  it('should serialize/deserialize List correctly', () => {
    const list = CLTypedAndToBytesHelper.list([
      CLTypedAndToBytesHelper.u32(1),
      CLTypedAndToBytesHelper.u32(2),
      CLTypedAndToBytesHelper.u32(3)
    ]);
    jsonRoundTrip(CLValue.fromT(list), {
      cl_type: { List: 'U32' },
      bytes: '03000000010000000200000003000000'
    });

    expect(() => {
      CLTypedAndToBytesHelper.list([
        CLTypedAndToBytesHelper.u32(1),
        CLTypedAndToBytesHelper.u64(2),
        CLTypedAndToBytesHelper.u32(3)
      ]);
    }).to.throw();

    const composedList = CLTypedAndToBytesHelper.list([list, list, list]);
    jsonRoundTrip(CLValue.fromT(composedList), {
      cl_type: { List: { List: 'U32' } },
      bytes:
        '03000000030000000100000002000000030000000300000001000000020000000300000003000000010000000200000003000000'
    });
  });

  it('should serialize/deserialize Option correctly', () => {
    const opt = CLTypedAndToBytesHelper.option(
      CLTypedAndToBytesHelper.string('test')
    );

    jsonRoundTrip(CLValue.fromT(opt), {
      cl_type: { Option: 'String' },
      bytes: '010400000074657374'
    });

    const list = CLTypedAndToBytesHelper.list([
      CLTypedAndToBytesHelper.u32(1),
      CLTypedAndToBytesHelper.u32(2),
      CLTypedAndToBytesHelper.u32(3)
    ]);

    jsonRoundTrip(CLValue.fromT(CLTypedAndToBytesHelper.option(list)), {
      cl_type: { Option: { List: 'U32' } },
      bytes: '0103000000010000000200000003000000'
    });

    jsonRoundTrip(
      CLValue.fromT(CLTypedAndToBytesHelper.option(null, CLTypeHelper.u32())),
      { cl_type: { Option: 'U32' }, bytes: '00' }
    );
  });
});
