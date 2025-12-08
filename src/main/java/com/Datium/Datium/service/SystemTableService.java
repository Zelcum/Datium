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
        // Validate Plan Limit first
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
        
        // 1. Delete all records with Cascade logic
        // We need a way to get record IDs. Since SystemDataService has `getRecordsByTable`, we can use it.
        // But `getRecordsByTable` returns Response objects. 
        // Or we can just use a Repository here? We don't have SystemRecordRepository injected.
        // Let's rely on SystemDataService.getRecordsByTable might be slow if we have to map.
        // But reusing service logic is cleaner.
        
        List<com.Datium.Datium.dto.SystemRecordResponse> records = systemDataService.getRecordsByTable(tableId, userId);
        for (com.Datium.Datium.dto.SystemRecordResponse rec : records) {
             systemDataService.deleteRecord(rec.getId(), userId);
        }
        
        // 2. Delete fields/options? Cascade usually handles this if mapped, but manually:
        // SystemDataService should handle fields? 
        // Actually databases cascade delete FKs if configured, but here we do it logically.
        // Fields are distinct entities.
        
        // 3. Delete Table
        tableRepository.delete(table);
    }
    public SystemTable updateTable(Integer tableId, com.Datium.Datium.dto.TableRequest request, Integer userId) {
        SystemTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));

        // Name check (ignore self)
        if (!table.getName().equals(request.getName()) && tableRepository.existsBySystemIdAndName(table.getSystemId(), request.getName())) {
            throw new RuntimeException("Ya existe una tabla con ese nombre en este sistema");
        }
        
        table.setName(request.getName());
        table.setDescription(request.getDescription());
        table = tableRepository.save(table);

        if (request.getFields() != null) {
            // Get existing fields
            List<com.Datium.Datium.dto.SystemFieldResponse> existingFields = systemDataService.getFieldsByTable(tableId, userId);
            java.util.Set<Integer> existingFieldIds = existingFields.stream()
                    .map(com.Datium.Datium.dto.SystemFieldResponse::getId)
                    .collect(java.util.stream.Collectors.toSet());

            java.util.Set<Integer> processedFieldIds = new java.util.HashSet<>();

            for (com.Datium.Datium.dto.SystemFieldRequest fieldReq : request.getFields()) {
                if (fieldReq.getId() != null && existingFieldIds.contains(fieldReq.getId())) {
                    // Update
                    systemDataService.updateField(table.getSystemId(), fieldReq.getId(), fieldReq, userId);
                    processedFieldIds.add(fieldReq.getId());
                } else {
                    // Create
                    systemDataService.createFieldForTable(table.getId(), fieldReq, userId);
                }
            }

            // Delete removed fields
            for (Integer existingId : existingFieldIds) {
                if (!processedFieldIds.contains(existingId)) {
                    systemDataService.deleteField(table.getSystemId(), existingId, userId);
                }
            }
        }

        return table;
    }
}
