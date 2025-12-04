package com.Datium.Datium.service;

import com.Datium.Datium.dto.SystemTableColumnRequest;
import com.Datium.Datium.dto.SystemTableColumnResponse;
import com.Datium.Datium.entity.SystemTable;
import com.Datium.Datium.entity.SystemTableColumn;
import com.Datium.Datium.repository.SystemTableColumnRepository;
import com.Datium.Datium.repository.SystemTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SystemTableColumnService {

    @Autowired
    private SystemTableColumnRepository columnRepository;

    @Autowired
    private SystemTableRepository tableRepository;

    public List<SystemTableColumnResponse> getColumnsByTableId(Integer tableId) {
        List<SystemTableColumn> columns = columnRepository.findByTableIdOrderByOrderIndexAsc(tableId);
        return columns.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public SystemTableColumnResponse createColumn(Integer tableId, SystemTableColumnRequest request) {
        SystemTableColumn column = new SystemTableColumn();
        column.setTableId(tableId);
        updateColumnFromRequest(column, request);
        SystemTableColumn saved = columnRepository.save(column);
        return toResponse(saved);
    }

    @Transactional
    public SystemTableColumnResponse updateColumn(Integer columnId, SystemTableColumnRequest request) {
        SystemTableColumn column = columnRepository.findById(columnId)
                .orElseThrow(() -> new RuntimeException("Column not found"));
        updateColumnFromRequest(column, request);
        SystemTableColumn updated = columnRepository.save(column);
        return toResponse(updated);
    }

    @Transactional
    public void deleteColumn(Integer columnId) {
        columnRepository.deleteById(columnId);
    }

    private void updateColumnFromRequest(SystemTableColumn column, SystemTableColumnRequest request) {
        column.setName(request.getName());
        column.setDataType(request.getDataType());
        column.setLength(request.getLength());
        column.setIsPrimaryKey(request.getIsPrimaryKey() != null ? request.getIsPrimaryKey() : false);
        column.setIsForeignKey(request.getIsForeignKey() != null ? request.getIsForeignKey() : false);
        column.setIsUnique(request.getIsUnique() != null ? request.getIsUnique() : false);
        column.setIsNullable(request.getIsNullable() != null ? request.getIsNullable() : true);
        column.setDefaultValue(request.getDefaultValue());
        column.setForeignTableId(request.getForeignTableId());
        column.setForeignColumnId(request.getForeignColumnId());
        column.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
    }

    private SystemTableColumnResponse toResponse(SystemTableColumn column) {
        SystemTableColumnResponse response = new SystemTableColumnResponse();
        response.setId(column.getId());
        response.setTableId(column.getTableId());
        response.setName(column.getName());
        response.setDataType(column.getDataType());
        response.setLength(column.getLength());
        response.setIsPrimaryKey(column.getIsPrimaryKey());
        response.setIsForeignKey(column.getIsForeignKey());
        response.setIsUnique(column.getIsUnique());
        response.setIsNullable(column.getIsNullable());
        response.setDefaultValue(column.getDefaultValue());
        response.setForeignTableId(column.getForeignTableId());
        response.setForeignColumnId(column.getForeignColumnId());
        response.setOrderIndex(column.getOrderIndex());
        response.setCreatedAt(column.getCreatedAt());

        if (column.getForeignTableId() != null) {
            tableRepository.findById(column.getForeignTableId()).ifPresent(table -> {
                response.setForeignTableName(table.getName());
            });
        }

        if (column.getForeignColumnId() != null) {
            columnRepository.findById(column.getForeignColumnId()).ifPresent(foreignColumn -> {
                response.setForeignColumnName(foreignColumn.getName());
            });
        }

        return response;
    }
}
