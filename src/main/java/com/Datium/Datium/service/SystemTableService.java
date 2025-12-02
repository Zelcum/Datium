package com.Datium.Datium.service;

import com.Datium.Datium.dto.SystemTableRequest;
import com.Datium.Datium.dto.SystemTableResponse;
import com.Datium.Datium.entity.SystemTable;
import com.Datium.Datium.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SystemTableService {

    @Autowired
    private SystemTableRepository systemTableRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private SystemUserRepository systemUserRepository;

    @Autowired
    private SystemFieldRepository systemFieldRepository;

    @Autowired
    private SystemRecordRepository systemRecordRepository;

    @Autowired
    private SystemRelationshipRepository systemRelationshipRepository;

    private boolean hasPermission(Integer systemId, Integer userId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
                .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (system.getOwnerId().equals(userId)) {
            return true;
        }

        return systemUserRepository.existsBySystemIdAndUserId(systemId, userId);
    }

    public List<SystemTableResponse> getAllTables(Integer systemId, Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para ver las tablas de este sistema");
        }

        List<SystemTable> tables = systemTableRepository.findBySystemIdOrderByCreatedAtAsc(systemId);
        return tables.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    public SystemTableResponse getTableById(Integer systemId, Integer tableId, Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para ver esta tabla");
        }

        SystemTable table = systemTableRepository.findByIdAndSystemId(tableId, systemId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));

        return convertToResponse(table);
    }

    @Transactional
    public SystemTableResponse createTable(Integer systemId, SystemTableRequest request, Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para crear tablas en este sistema");
        }

        SystemTable table = new SystemTable();
        table.setSystemId(systemId);
        table.setName(request.getName());
        table.setDescription(request.getDescription());

        table = systemTableRepository.save(table);
        return convertToResponse(table);
    }

    @Transactional
    public SystemTableResponse updateTable(Integer systemId, Integer tableId, SystemTableRequest request,
            Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para actualizar esta tabla");
        }

        SystemTable table = systemTableRepository.findByIdAndSystemId(tableId, systemId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));

        table.setName(request.getName());
        table.setDescription(request.getDescription());

        table = systemTableRepository.save(table);
        return convertToResponse(table);
    }

    @Transactional
    public void deleteTable(Integer systemId, Integer tableId, Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para eliminar esta tabla");
        }

        SystemTable table = systemTableRepository.findByIdAndSystemId(tableId, systemId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));

        // Delete relationships involving this table
        systemRelationshipRepository.deleteByTableId(tableId);

        systemTableRepository.delete(table);
    }

    private SystemTableResponse convertToResponse(SystemTable table) {
        SystemTableResponse response = new SystemTableResponse();
        response.setId(table.getId());
        response.setSystemId(table.getSystemId());
        response.setName(table.getName());
        response.setDescription(table.getDescription());
        response.setCreatedAt(table.getCreatedAt());

        // Count fields and records for this table
        Long fieldsCount = systemFieldRepository.countByTableId(table.getId());
        Long recordsCount = systemRecordRepository.countByTableId(table.getId());

        response.setFieldsCount(fieldsCount != null ? fieldsCount : 0L);
        response.setRecordsCount(recordsCount != null ? recordsCount : 0L);

        return response;
    }
}
