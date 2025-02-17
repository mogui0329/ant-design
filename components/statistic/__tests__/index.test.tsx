import React from 'react';
import MockDate from 'mockdate';
import moment from 'moment';
import Statistic from '..';
import type Countdown from '../Countdown';
import { formatTimeStr } from '../utils';
import { sleep, render, fireEvent } from '../../../tests/utils';
import mountTest from '../../../tests/shared/mountTest';
import rtlTest from '../../../tests/shared/rtlTest';

describe('Statistic', () => {
  mountTest(Statistic);
  mountTest(Statistic.Countdown);
  rtlTest(Statistic);

  beforeAll(() => {
    MockDate.set(moment('2018-11-28 00:00:00').valueOf());
  });

  afterAll(() => {
    MockDate.reset();
  });

  it('`-` is not a number', () => {
    const { container } = render(<Statistic value="-" />);
    expect(container.querySelector('.ant-statistic-content')!.textContent).toEqual('-');
  });

  it('customize formatter', () => {
    const formatter = jest.fn(() => 93);
    const { container } = render(<Statistic value={1128} formatter={formatter} />);
    expect(formatter).toHaveBeenCalledWith(1128);
    expect(container.querySelector('.ant-statistic-content-value')!.textContent).toEqual('93');
  });

  it('groupSeparator', () => {
    const { container } = render(<Statistic value={1128} groupSeparator="__TEST__" />);
    expect(container.querySelector('.ant-statistic-content-value')!.textContent).toEqual(
      '1__TEST__128',
    );
  });

  it('not a number', () => {
    const { container } = render(<Statistic value="bamboo" />);
    expect(container.querySelector('.ant-statistic-content-value')!.textContent).toEqual('bamboo');
  });

  it('support negetive number', () => {
    const { asFragment } = render(
      <Statistic title="Account Balance (CNY)" value={-112893.12345} precision={2} />,
    );
    expect(asFragment().firstChild).toMatchSnapshot();
  });

  it('allow negetive precision', () => {
    [
      [-1, -1112893.1212, '-1,112,893'],
      [-2, -1112893.1212, '-1,112,893'],
      [-3, -1112893.1212, '-1,112,893'],
      [-1, -1112893, '-1,112,893'],
      [-1, 1112893, '1,112,893'],
    ].forEach(([precision, value, expectValue]: [number, number, string]) => {
      const { container } = render(<Statistic precision={precision} value={value} />);
      expect(container.querySelector('.ant-statistic-content-value-int')!.textContent).toEqual(
        expectValue,
      );
      expect(container.querySelectorAll('.ant-statistic-content-value-decimal').length).toBe(0);
    });
  });

  it('loading with skeleton', async () => {
    let loading = false;
    const { container, rerender } = render(
      <Statistic title="Active Users" value={112112} loading={loading} />,
    );
    expect(container.querySelectorAll('.ant-skeleton')).toHaveLength(0);
    expect(container.querySelectorAll('.ant-statistic-content')).toHaveLength(1);

    loading = true;
    rerender(<Statistic title="Active Users" value={112112} loading={loading} />);
    expect(container.querySelectorAll('.ant-skeleton')).toHaveLength(1);
    expect(container.querySelectorAll('.ant-statistic-content')).toHaveLength(0);
  });

  describe('Countdown', () => {
    it('render correctly', () => {
      const now = moment().add(2, 'd').add(11, 'h').add(28, 'm').add(9, 's').add(3, 'ms').valueOf();

      [
        ['H:m:s', '59:28:9'],
        ['HH:mm:ss', '59:28:09'],
        ['HH:mm:ss:SSS', '59:28:09:003'],
        ['DD-HH:mm:ss', '02-11:28:09'],
      ].forEach(([format, value]) => {
        const { container } = render(<Statistic.Countdown format={format} value={now} />);
        expect(container.querySelector('.ant-statistic-content-value')!.textContent).toEqual(value);
      });
    });

    it('time going', async () => {
      const now = Date.now() + 1000;
      const onFinish = jest.fn();
      const instance = React.createRef<Countdown>();
      const { unmount } = render(
        <Statistic.Countdown ref={instance} value={now} onFinish={onFinish} />,
      );

      // setInterval should work
      expect(instance.current!.countdownId).not.toBe(undefined);

      await sleep(10);

      unmount();
      expect(onFinish).not.toHaveBeenCalled();
    });

    it('responses hover events', () => {
      const onMouseEnter = jest.fn();
      const onMouseLeave = jest.fn();
      const { container } = render(
        <Statistic onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />,
      );
      fireEvent.mouseEnter(container.firstChild!);
      expect(onMouseEnter).toHaveBeenCalled();
      fireEvent.mouseLeave(container.firstChild!);
      expect(onMouseLeave).toHaveBeenCalled();
    });

    it('responses hover events for Countdown', () => {
      const onMouseEnter = jest.fn();
      const onMouseLeave = jest.fn();
      const { container } = render(
        <Statistic.Countdown onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />,
      );
      fireEvent.mouseEnter(container.firstChild!);
      expect(onMouseEnter).toHaveBeenCalled();
      fireEvent.mouseLeave(container.firstChild!);
      expect(onMouseLeave).toHaveBeenCalled();
    });

    describe('time onchange', () => {
      it("called if time has't passed", async () => {
        const deadline = Date.now() + 10 * 1000;
        let remainingTime;

        const onChange = (value: number) => {
          remainingTime = value;
        };
        render(<Statistic.Countdown value={deadline} onChange={onChange} />);
        // container.update();
        await sleep(100);
        expect(remainingTime).toBeGreaterThan(0);
      });
    });

    describe('time finished', () => {
      it('not call if time already passed', () => {
        const now = Date.now() - 1000;
        const instance = React.createRef<Countdown>();
        const onFinish = jest.fn();
        render(<Statistic.Countdown ref={instance} value={now} onFinish={onFinish} />);

        expect(instance.current!.countdownId).toBe(undefined);
        expect(onFinish).not.toHaveBeenCalled();
      });

      it('called if finished', async () => {
        const now = Date.now() + 10;
        const onFinish = jest.fn();
        render(<Statistic.Countdown value={now} onFinish={onFinish} />);
        MockDate.set(moment('2019-11-28 00:00:00').valueOf());
        await sleep(100);
        expect(onFinish).toHaveBeenCalled();
      });
    });
  });

  describe('utils', () => {
    it('format should support escape', () => {
      expect(formatTimeStr(1000 * 60 * 60 * 24, 'D [Day]')).toBe('1 Day');
    });
  });
});
