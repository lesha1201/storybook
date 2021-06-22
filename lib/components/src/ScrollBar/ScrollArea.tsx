import { Theme } from '@storybook/theming';
import React, {
  FC,
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { document as _document } from 'global';
import { useDOMRect } from '@storybook/addons';
import * as Styled from './styled';
import { getHorizontalValues } from './utils/get-horiztontal-values';
import { getVerticalValues } from './utils/get-vertical-values';

const document = _document as Document;

const sliderSafePadding = 3;
const defaultSliderColor = '#1ea7fd';
const defaultSliderOpacity = 0.5;
const defaultSliderPadding = 4;
const defaultSliderSize = 6;

export interface ScrollAreaRenderProps {
  left: number;
  bottom: number;
  top: number;
  right: number;
  x: number;
  y: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
  scrollLeft: number;
  scrollTop: number;
}

interface StateItem {
  enabled: boolean;
  show: boolean;
  grabIntent: boolean;
  sliderPosition: number;
  sliderSize: number;
  trackLeft: number;
  trackSize: number;
  trackTop: number;
}

interface State {
  horizontal: StateItem;
  vertical: StateItem;
}

type ChildRenderFunction = (renderProps: ScrollAreaRenderProps) => ReactNode;

export type ScrollAreaProps = {
  absolute?: boolean;
  children?: ChildRenderFunction | ReactNode;
  horizontal?: boolean;
  horizontalPosition?: 'top' | 'bottom';
  showOn?: 'always' | 'hover' | 'never' | 'scroll';
  sliderColor?: string;
  sliderOpacity?: number;
  sliderPadding?: number;
  sliderSize?: number;
  sliderType?: keyof Theme['color'];
  vertical?: boolean;
  verticalPosition?: 'left' | 'right';
  ContentProps?: HTMLAttributes<HTMLDivElement>;
  ContainerProps?: HTMLAttributes<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>;

export const ScrollArea: FC<ScrollAreaProps> = ({
  absolute,
  horizontal: enableHorizontal = true,
  horizontalPosition = 'bottom',
  showOn = 'hover',
  sliderColor = defaultSliderColor,
  sliderOpacity = defaultSliderOpacity,
  sliderPadding = defaultSliderPadding,
  sliderSize = defaultSliderSize,
  sliderType,
  vertical: enableVertical = true,
  verticalPosition = 'right',
  onScroll,
  children,
  ContentProps = {},
  ContainerProps = {},
  ...rest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const verticalDragRef = useRef(0);
  const horizontalDragRef = useRef(0);
  const scrollRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const {
    ref: outerRef,
    rect: { width: outerWidth, height: outerHeight, top, bottom, left, right, x, y },
  } = useDOMRect({ live: true });
  const {
    ref: innerRef,
    rect: { width: innerWidth, height: innerHeight },
  } = useDOMRect({ live: true });

  const [state, setState] = useState<State>({
    vertical: {
      enabled: enableVertical,
      grabIntent: false,
      sliderPosition: 0,
      sliderSize: 0,
      trackLeft: 0,
      trackSize: 0,
      trackTop: 0,
      show: showOn === 'always',
    },
    horizontal: {
      enabled: enableHorizontal,
      grabIntent: false,
      sliderPosition: 0,
      sliderSize: 0,
      trackLeft: 0,
      trackSize: 0,
      trackTop: 0,
      show: showOn === 'always',
    },
  });

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
      const { scrollLeft, scrollTop } = event.currentTarget;
      const oldScrollRef = scrollRef.current;
      scrollRef.current += 1;

      const oldScrollLeft = scrollLeftRef.current;
      const oldScrollTop = scrollTopRef.current;
      scrollTopRef.current = scrollTop;
      scrollLeftRef.current = scrollLeft;

      const verticalScrollChange = scrollTop !== oldScrollTop;
      const horizontalScrollChange = scrollLeft !== oldScrollLeft;

      setState({
        ...state,
        horizontal: {
          ...state.horizontal,
          ...getHorizontalValues({
            enableHorizontal,
            enableVertical,
            horizontalPosition,
            innerWidth,
            outerHeight,
            outerWidth,
            scrollLeft,
            sliderPadding,
            sliderSafePadding,
            sliderSize,
            verticalPosition,
          }),
          show: showOn === 'scroll' ? horizontalScrollChange : state.horizontal.show,
        },
        vertical: {
          ...state.vertical,
          ...getVerticalValues({
            enableHorizontal,
            enableVertical,
            horizontalPosition,
            innerHeight,
            outerHeight,
            outerWidth,
            scrollTop,
            sliderPadding,
            sliderSafePadding,
            sliderSize,
            verticalPosition,
          }),
          show: showOn === 'scroll' ? verticalScrollChange : state.vertical.show,
        },
      });

      if (onScroll) {
        event.persist();
        onScroll(event);
      }

      if (showOn === 'scroll') {
        setTimeout(() => {
          if (oldScrollRef + 1 === scrollRef.current) {
            scrollRef.current = 0;
            setState({
              ...state,
              horizontal: { ...state.horizontal, show: false },
              vertical: { ...state.vertical, show: false },
            });
          }
        }, 350);
      }
    },
    [
      enableHorizontal,
      enableVertical,
      horizontalPosition,
      innerWidth,
      outerHeight,
      outerRef,
      outerWidth,
      setState,
      sliderPadding,
      sliderSafePadding,
      sliderSize,
      state,
      verticalPosition,
    ]
  );

  const handleMouseEnter = useCallback(
    (event) => {
      if (showOn === 'hover') {
        setState({
          ...state,
          horizontal: { ...state.horizontal, show: true },
          vertical: { ...state.vertical, show: true },
        });
      }

      if (rest.onMouseEnter) {
        event.persist();
        rest.onMouseEnter(event);
      }
    },
    [rest, showOn, state, setState]
  );

  const handleMouseLeave = useCallback(
    (event) => {
      if (showOn === 'hover') {
        setState({
          ...state,
          horizontal: { ...state.horizontal, show: false },
          vertical: { ...state.vertical, show: false },
        });
      }

      if (rest.onMouseLeave) {
        event.persist();
        rest.onMouseLeave(event);
      }
    },
    [rest]
  );

  const handleVerticalDrag = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const delta = event.screenY - verticalDragRef.current;

      const maxSliderPosition = state.vertical.trackSize - state.vertical.sliderSize;
      const maxRefScroll = innerHeight - outerHeight;
      const currentSliderPosition = state.vertical.sliderPosition;
      const newSliderPosition = currentSliderPosition + delta;

      if (newSliderPosition > 0 && newSliderPosition <= maxSliderPosition) {
        const sliderRatio = newSliderPosition / maxSliderPosition;
        const scrollTop = sliderRatio * maxRefScroll;
        containerRef.current.scrollTo({ top: scrollTop, left: containerRef.current.scrollLeft });
      }
    },
    [verticalDragRef, state, containerRef, outerHeight, innerHeight]
  );

  const verticalDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleVerticalDrag);
    document.removeEventListener('mouseup', verticalDragEnd);

    verticalDragRef.current = 0;
  }, [state, setState, handleVerticalDrag]);

  const verticalDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      verticalDragRef.current = event.screenY;
      document.addEventListener('mousemove', handleVerticalDrag);
      document.addEventListener('mouseup', verticalDragEnd);
    },
    [state, setState, handleVerticalDrag, verticalDragEnd]
  );

  const handleHorizontalDrag = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const delta = event.screenX - horizontalDragRef.current;

      const maxSliderPosition = state.horizontal.trackSize - state.horizontal.sliderSize;
      const maxRefScroll = innerWidth - outerWidth;
      const currentSliderPosition = state.horizontal.sliderPosition;
      const newSliderPosition = currentSliderPosition + delta;

      if (newSliderPosition > 0 && newSliderPosition <= maxSliderPosition) {
        const sliderRatio = newSliderPosition / maxSliderPosition;
        const scrollLeft = sliderRatio * maxRefScroll;
        containerRef.current.scrollTo({ top: containerRef.current.scrollTop, left: scrollLeft });
      }
    },
    [horizontalDragRef, state, containerRef, outerWidth, innerWidth]
  );

  const horizontalDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleHorizontalDrag);
    document.removeEventListener('mouseup', horizontalDragEnd);

    horizontalDragRef.current = 0;
  }, [state, setState, handleHorizontalDrag]);

  const horizontalDragStart = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      horizontalDragRef.current = event.screenX;
      document.addEventListener('mousemove', handleHorizontalDrag);
      document.addEventListener('mouseup', horizontalDragEnd);
    },
    [state, setState, handleHorizontalDrag, horizontalDragEnd]
  );

  // Get initial scroll position once outerRef and innerRef are not null
  useEffect(() => {
    if (outerRef !== null && outerRef.current && innerRef !== null && innerRef.current) {
      const { scrollTop, scrollLeft } = outerRef.current;
      scrollTopRef.current = scrollTop;
      scrollLeftRef.current = scrollLeft;

      setState({
        ...state,
        horizontal: {
          ...state.horizontal,
          ...getHorizontalValues({
            enableHorizontal,
            enableVertical,
            horizontalPosition,
            innerWidth,
            outerHeight,
            outerWidth,
            scrollLeft,
            sliderPadding,
            sliderSafePadding,
            sliderSize,
            verticalPosition,
          }),
        },
        vertical: {
          ...state.vertical,
          ...getVerticalValues({
            enableHorizontal,
            enableVertical,
            horizontalPosition,
            innerHeight,
            outerHeight,
            outerWidth,
            scrollTop,
            sliderPadding,
            sliderSafePadding,
            sliderSize,
            verticalPosition,
          }),
        },
      });
    }
  }, [outerRef, innerRef]);

  // Get new state in case the dimensions of either inner or outer changes
  useEffect(() => {
    let horizontalStateValue: StateItem = { ...state.horizontal };
    let verticalStateValue: StateItem = { ...state.vertical };
    const allowVertical = innerHeight > outerHeight && enableVertical;
    const allowHorizontal = innerWidth > outerWidth && enableHorizontal;

    scrollTopRef.current = outerRef.current.scrollTop;
    scrollLeftRef.current = outerRef.current.scrollLeft;

    if (allowVertical) {
      verticalStateValue = {
        ...state.vertical,
        ...getVerticalValues({
          enableHorizontal: allowHorizontal,
          enableVertical,
          horizontalPosition,
          innerHeight,
          outerHeight,
          outerWidth,
          scrollTop: outerRef.current.scrollTop,
          sliderPadding,
          sliderSafePadding,
          sliderSize,
          verticalPosition,
        }),
      };
    } else {
      verticalStateValue = {
        ...verticalStateValue,
        enabled: false,
      };
    }

    if (allowHorizontal) {
      horizontalStateValue = {
        ...state.horizontal,
        ...getHorizontalValues({
          enableHorizontal,
          enableVertical: allowVertical,
          horizontalPosition,
          innerWidth,
          outerHeight,
          outerWidth,
          scrollLeft: outerRef.current.scrollLeft,
          sliderPadding,
          sliderSafePadding,
          sliderSize,
          verticalPosition,
        }),
      };
    } else {
      horizontalStateValue = {
        ...horizontalStateValue,
        enabled: false,
      };
    }

    setState({
      ...state,
      horizontal: horizontalStateValue,
      vertical: verticalStateValue,
    });
  }, [innerWidth, outerWidth, innerHeight, outerHeight]);

  // Make sure we can handle new props coming from the outside without problems
  useEffect(() => {
    const { scrollTop, scrollLeft } = outerRef.current;

    setState({
      ...state,
      horizontal: {
        ...state.horizontal,
        ...getHorizontalValues({
          enableHorizontal,
          enableVertical,
          horizontalPosition,
          innerWidth,
          outerHeight,
          outerWidth,
          scrollLeft,
          sliderPadding,
          sliderSafePadding,
          sliderSize,
          verticalPosition,
        }),
      },
      vertical: {
        ...state.vertical,
        ...getVerticalValues({
          enableHorizontal,
          enableVertical,
          horizontalPosition,
          innerHeight,
          outerHeight,
          outerWidth,
          scrollTop,
          sliderPadding,
          sliderSafePadding,
          sliderSize,
          verticalPosition,
        }),
      },
    });
  }, [
    enableHorizontal,
    enableVertical,
    horizontalPosition,
    verticalPosition,
    sliderSize,
    sliderPadding,
    showOn,
  ]);

  let child = children;

  if (children instanceof Function) {
    try {
      child = children as ChildRenderFunction;
      child = children({
        top,
        bottom,
        left,
        right,
        innerWidth,
        outerWidth,
        innerHeight,
        outerHeight,
        x,
        y,
        scrollLeft: scrollLeftRef.current,
        scrollTop: scrollTopRef.current,
      });
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }

  return (
    <Styled.Wrapper data-sb-scrollarea="" absolute={absolute} {...rest} ref={outerRef}>
      <Styled.ScrollableContainer
        data-sb-scrollarea-container=""
        tabIndex={0}
        absolute={absolute}
        parentWidth={outerWidth}
        parentHeight={outerHeight}
        ref={containerRef}
        {...ContainerProps}
        onScroll={handleScroll}
        onMouseOver={handleMouseEnter}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Styled.ScrollableContent
          data-sb-scrollarea-content=""
          ref={innerRef}
          absolute={absolute}
          {...ContentProps}
        >
          {child}
        </Styled.ScrollableContent>
      </Styled.ScrollableContainer>
      {state.vertical.enabled && (
        <Styled.VerticalTrack
          data-sb-scrollarea-track=""
          data-sb-scrollarea-track-vertical=""
          show={state.vertical.show}
          showOn={showOn}
          sliderOpacity={sliderOpacity}
          sliderPadding={sliderPadding}
          onMouseOver={handleMouseEnter}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            left: state.vertical.trackLeft,
            top: state.vertical.trackTop,
            height: state.vertical.trackSize,
          }}
        >
          <Styled.VerticalSlider
            data-sb-scrollarea-slider=""
            data-sb-scrollarea-slider-vertical=""
            sliderColor={sliderColor}
            sliderSize={sliderSize}
            sliderType={sliderType}
            onMouseDown={verticalDragStart}
            style={{
              transform: `translateY(${state.vertical.sliderPosition}px)`,
              height: state.vertical.sliderSize,
            }}
          />
        </Styled.VerticalTrack>
      )}
      {state.horizontal.enabled && (
        <Styled.HorizontalTrack
          data-sb-scrollarea-track=""
          data-sb-scrollarea-track-horizontal=""
          show={state.horizontal.show}
          showOn={showOn}
          sliderOpacity={sliderOpacity}
          sliderPadding={sliderPadding}
          onMouseOver={handleMouseEnter}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            left: state.horizontal.trackLeft,
            top: state.horizontal.trackTop,
            width: state.horizontal.trackSize,
          }}
        >
          <Styled.HorizontalSlider
            data-sb-scrollarea-slider=""
            data-sb-scrollarea-slider-horizontal=""
            sliderColor={sliderColor}
            sliderSize={sliderSize}
            sliderType={sliderType}
            onMouseDown={horizontalDragStart}
            style={{
              transform: `translateX(${state.horizontal.sliderPosition}px)`,
              width: state.horizontal.sliderSize,
            }}
          />
        </Styled.HorizontalTrack>
      )}
    </Styled.Wrapper>
  );
};