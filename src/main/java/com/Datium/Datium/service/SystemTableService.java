package com.Datium.Datium.service;

import com.Datium.Datium.entity.SystemTable;
import com.Datium.Datium.repository.SystemTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SystemTableService {
    @Autowired
    private SystemTableRepository tableRepository;

    public List<SystemTable> getTables(Integer systemId) {
        return tableRepository.findBySystemId(systemId);
    }

    public SystemTable getTable(Integer tableId) {
        return tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));
    }

    @Autowired
    private SystemDataService systemDataService;

    @Autowired
    private PlanValidationService planValidationService;

    public SystemTable createTable(Integer systemId, com.Datium.Datium.dto.TableRequest request, Integer userId) {
        planValidationService.validateTableLimit(systemId);

        if (tableRepository.existsBySystemIdAndName(systemId, request.getName())) {
            throw new RuntimeException("Ya existe una tabla con ese nombre en este sistema");
        }
        SystemTable table = new SystemTable();
        table.setSystemId(systemId);
        table.setName(request.getName());
        table.setDescription(request.getDescription());
        table = tableRepository.save(table);

        if (request.getFields() != null) {
            for (com.Datium.Datium.dto.SystemFieldRequest fieldRequest : request.getFields()) {
                systemDataService.createFieldForTable(table.getId(), fieldRequest, userId);
            }
        }
        return table;
    }

    public void deleteTable(Integer tableId, Integer userId) {
        SystemTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));
        
        List<com.Datium.Datium.dto.SystemRecordResponse> records = systemDataService.getRecordsByTable(tableId, userId);
        for (com.Datium.Datium.dto.SystemRecordResponse rec : records) {
             systemDataService.deleteRecord(rec.getId(), userId);
        }
        
        tableRepository.delete(table);
    }
    public SystemTable updateTable(Integer tableId, com.Datium.Datium.dto.TableRequest request, Integer userId) {
        SystemTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));

        if (!table.getName().equals(request.getName()) && tableRepository.existsBySystemIdAndName(table.getSystemId(), request.getName())) {
            throw new RuntimeException("Ya existe una tabla con ese nombre en este sistema");
        }
        
        table.setName(request.getName());
        table.setDescription(request.getDescription());
        table = tableRepository.save(table);

        if (request.getFields() != null) {
            List<com.Datium.Datium.dto.SystemFieldResponse> existingFields = systemDataService.getFieldsByTable(tableId, userId);
            java.util.Set<Integer> existingFieldIds = existingFields.stream()
                    .map(com.Datium.Datium.dto.SystemFieldResponse::getId)
                    .collect(java.util.stream.Collectors.toSet());

            java.util.Set<Integer> processedFieldIds = new java.util.HashSet<>();

            for (com.Datium.Datium.dto.SystemFieldRequest fieldReq : request.getFields()) {
                if (fieldReq.getId() != null && existingFieldIds.contains(fieldReq.getId())) {
                    systemDataService.updateField(table.getSystemId(), fieldReq.getId(), fieldReq, userId);
                    processedFieldIds.add(fieldReq.getId());
                } else {
                    systemDataService.createFieldForTable(table.getId(), fieldReq, userId);
                }
            }

            for (Integer existingId : existingFieldIds) {
                if (!processedFieldIds.contains(existingId)) {
                    systemDataService.deleteField(table.getSystemId(), existingId, userId);
                }
            }
        }

        return table;
    }


    @Autowired
    private com.Datium.Datium.repository.SystemRelationshipRepository relationshipRepository;

    @Autowired
    private com.Datium.Datium.repository.SystemRepository systemRepository;

    @org.springframework.transaction.annotation.Transactional
    public void moveTable(Integer tableId, Integer targetSystemId, Integer userId) {
        SystemTable table = getTable(tableId);
        
        // Validate target system exists and belongs to user
        com.Datium.Datium.entity.System targetSystem = systemRepository.findById(targetSystemId)
            .orElseThrow(() -> new RuntimeException("Sistema destino no encontrado"));
            
        if (!targetSystem.getOwnerId().equals(userId)) {
             throw new RuntimeException("No tienes permiso sobre el sistema destino");
        }
        
        // Validate source system ownership (implicit if we trust getTable+controller check, but better to be safe)
        // Checking if the table currently belongs to a system owned by the user is complex without extra lookups.
        // However, the controller usually validates token. 
        // We really should check if the current table's system belongs to the user or if the user has access.
        // Assuming for now getTable is just ID lookup.
        com.Datium.Datium.entity.System sourceSystem = systemRepository.findById(table.getSystemId())
            .orElseThrow(() -> new RuntimeException("Sistema origen no encontrado"));
        
        if (!sourceSystem.getOwnerId().equals(userId)) {
            throw new RuntimeException("No tienes permiso sobre el sistema origen");
        }

        // Validate table limit in target
        planValidationService.validateTableLimit(targetSystemId);

        // Check name conflict in target
        if (tableRepository.existsBySystemIdAndName(targetSystemId, table.getName())) {
            throw new RuntimeException("Ya existe una tabla con el nombre '" + table.getName() + "' en el sistema destino");
        }

        // Delete relationships involving this table because they might be invalid in the new context
        relationshipRepository.deleteByFromTableId(tableId);
        relationshipRepository.deleteByToTableId(tableId);

        // Move table
        table.setSystemId(targetSystemId);
        tableRepository.save(table);
    }
}
