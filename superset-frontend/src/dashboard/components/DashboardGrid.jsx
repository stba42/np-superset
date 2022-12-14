/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { styled, t } from '@superset-ui/core';
import { EmptyStateBig } from 'src/components/EmptyState';
import { componentShape } from '../util/propShapes';
import DashboardComponent from '../containers/DashboardComponent';
import DragDroppable from './dnd/DragDroppable';
import { GRID_GUTTER_SIZE, GRID_COLUMN_COUNT } from '../util/constants';
import { TAB_TYPE } from '../util/componentTypes';

const propTypes = {
  depth: PropTypes.number.isRequired,
  editMode: PropTypes.bool,
  gridComponent: componentShape,
  handleComponentDrop: PropTypes.func.isRequired,
  isComponentVisible: PropTypes.bool.isRequired,
  resizeComponent: PropTypes.func.isRequired,
  setDirectPathToChild: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
  dashboardId: PropTypes.number,
};

const defaultProps = {};

const renderDraggableContentBottom = dropProps =>
  dropProps.dropIndicatorProps && (
    <div className="drop-indicator drop-indicator--bottom" />
  );

const renderDraggableContentTop = dropProps =>
  dropProps.dropIndicatorProps && (
    <div className="drop-indicator drop-indicator--top" />
  );

const DashboardEmptyStateContainer = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
`;

class DashboardGrid extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isResizing: false,
      rowGuideTop: null,
    };

    this.handleResizeStart = this.handleResizeStart.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleResizeStop = this.handleResizeStop.bind(this);
    this.handleTopDropTargetDrop = this.handleTopDropTargetDrop.bind(this);
    this.getRowGuidePosition = this.getRowGuidePosition.bind(this);
    this.setGridRef = this.setGridRef.bind(this);
    this.handleChangeTab = this.handleChangeTab.bind(this);
  }

  getRowGuidePosition(resizeRef) {
    if (resizeRef && this.grid) {
      return (
        resizeRef.getBoundingClientRect().bottom -
        this.grid.getBoundingClientRect().top -
        2
      );
    }
    return null;
  }

  setGridRef(ref) {
    this.grid = ref;
  }

  handleResizeStart({ ref, direction }) {
    let rowGuideTop = null;
    if (direction === 'bottom' || direction === 'bottomRight') {
      rowGuideTop = this.getRowGuidePosition(ref);
    }

    this.setState(() => ({
      isResizing: true,
      rowGuideTop,
    }));
  }

  handleResize({ ref, direction }) {
    if (direction === 'bottom' || direction === 'bottomRight') {
      this.setState(() => ({ rowGuideTop: this.getRowGuidePosition(ref) }));
    }
  }

  handleResizeStop({ id, widthMultiple: width, heightMultiple: height }) {
    this.props.resizeComponent({ id, width, height });

    this.setState(() => ({
      isResizing: false,
      rowGuideTop: null,
    }));
  }

  handleTopDropTargetDrop(dropResult) {
    if (dropResult) {
      this.props.handleComponentDrop({
        ...dropResult,
        destination: {
          ...dropResult.destination,
          // force appending as the first child if top drop target
          index: 0,
        },
      });
    }
  }

  handleChangeTab({ pathToTabIndex }) {
    this.props.setDirectPathToChild(pathToTabIndex);
  }

  render() {
    const {
      gridComponent,
      handleComponentDrop,
      depth,
      width,
      isComponentVisible,
      editMode,
      canEdit,
      setEditMode,
      dashboardId,
    } = this.props;
    const columnPlusGutterWidth =
      (width + GRID_GUTTER_SIZE) / GRID_COLUMN_COUNT;

    const columnWidth = columnPlusGutterWidth - GRID_GUTTER_SIZE;
    const { isResizing, rowGuideTop } = this.state;

    const shouldDisplayEmptyState = gridComponent?.children?.length === 0;
    const shouldDisplayTopLevelTabEmptyState =
      shouldDisplayEmptyState && gridComponent.type === TAB_TYPE;

    const dashboardEmptyState = editMode && (
      <EmptyStateBig
        title={t('Drag and drop components and charts to the dashboard')}
        description={t(
          'You can create a new chart or use existing ones from the panel on the right',
        )}
        buttonText={
          <>
            <i className="fa fa-plus" />
            {t('Create a new chart')}
          </>
        }
        buttonAction={() => {
          window.open(
            `/chart/add?dashboard_id=${dashboardId}`,
            '_blank',
            'noopener noreferrer',
          );
        }}
        image="chart.svg"
      />
    );

    const topLevelTabEmptyState = editMode ? (
      <EmptyStateBig
        title={t('Drag and drop components to this tab')}
        description={t(
          `You can create a new chart or use existing ones from the panel on the right`,
        )}
        buttonText={
          <>
            <i className="fa fa-plus" />
            {t('Create a new chart')}
          </>
        }
        buttonAction={() => {
          window.open(
            `/chart/add?dashboard_id=${dashboardId}`,
            '_blank',
            'noopener noreferrer',
          );
        }}
        image="chart.svg"
      />
    ) : (
      <EmptyStateBig
        title={t('There are no components added to this tab')}
        description={
          canEdit && t('You can add the components in the edit mode.')
        }
        buttonText={canEdit && t('Edit the dashboard')}
        buttonAction={
          canEdit &&
          (() => {
            setEditMode(true);
          })
        }
        image="chart.svg"
      />
    );

    return width < 100 ? null : (
      <>
        {shouldDisplayEmptyState && (
          <DashboardEmptyStateContainer>
            {shouldDisplayTopLevelTabEmptyState
              ? topLevelTabEmptyState
              : dashboardEmptyState}
          </DashboardEmptyStateContainer>
        )}
        <div className="dashboard-grid" ref={this.setGridRef}>
          <div className="grid-content" data-test="grid-content">
            {/* make the area above components droppable */}
            {editMode && (
              <DragDroppable
                component={gridComponent}
                depth={depth}
                parentComponent={null}
                index={0}
                orientation="column"
                onDrop={this.handleTopDropTargetDrop}
                className="empty-droptarget"
                editMode
              >
                {renderDraggableContentBottom}
              </DragDroppable>
            )}
            {gridComponent?.children?.map((id, index) => (
              <DashboardComponent
                key={id}
                id={id}
                parentId={gridComponent.id}
                depth={depth + 1}
                index={index}
                availableColumnCount={GRID_COLUMN_COUNT}
                columnWidth={columnWidth}
                isComponentVisible={isComponentVisible}
                onResizeStart={this.handleResizeStart}
                onResize={this.handleResize}
                onResizeStop={this.handleResizeStop}
                onChangeTab={this.handleChangeTab}
              />
            ))}
            {/* make the area below components droppable */}
            {editMode && gridComponent?.children?.length > 0 && (
              <DragDroppable
                component={gridComponent}
                depth={depth}
                parentComponent={null}
                index={gridComponent.children.length}
                orientation="column"
                onDrop={handleComponentDrop}
                className="empty-droptarget"
                editMode
              >
                {renderDraggableContentTop}
              </DragDroppable>
            )}
            {isResizing &&
              Array(GRID_COLUMN_COUNT)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={`grid-column-${i}`}
                    className="grid-column-guide"
                    style={{
                      left: i * GRID_GUTTER_SIZE + i * columnWidth,
                      width: columnWidth,
                    }}
                  />
                ))}
            {isResizing && rowGuideTop && (
              <div
                className="grid-row-guide"
                style={{
                  top: rowGuideTop,
                  width,
                }}
              />
            )}
          </div>
        </div>
      </>
    );
  }
}

DashboardGrid.propTypes = propTypes;
DashboardGrid.defaultProps = defaultProps;

export default DashboardGrid;
