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
        auditService.log(systemId, userId, "Crear Tabla", "Se creó la tabla '" + table.getName() + "'", null);
        return table;
    }

    public void deleteTable(Integer tableId, Integer userId) {
        SystemTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));
        
        List<com.Datium.Datium.dto.SystemRecordResponse> records = systemDataService.getRecordsByTable(tableId, userId);
        for (com.Datium.Datium.dto.SystemRecordResponse rec : records) {
             systemDataService.deleteRecord(rec.getId(), userId);
        }
        
        auditService.log(table.getSystemId(), userId, "Eliminar Tabla", "Se eliminó la tabla '" + table.getName() + "'", null);
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

    @Autowired
    private com.Datium.Datium.repository.SystemShareRepository systemShareRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private com.Datium.Datium.repository.SystemUserRepository systemUserRepository;

    @org.springframework.transaction.annotation.Transactional
    public void copyTable(Integer tableId, Integer targetSystemId, Integer userId) {
        SystemTable sourceTable = getTable(tableId);

        // Access checks
        checkSystemAccess(targetSystemId, userId, "No tienes permiso para modificar el sistema destino", true);
        checkSystemAccess(sourceTable.getSystemId(), userId, "No tienes permiso para ver el sistema origen", false);
        
        // Limits
        planValidationService.validateTableLimit(targetSystemId);
        
        // Name conflict check
        String newName = sourceTable.getName();
        if (tableRepository.existsBySystemIdAndName(targetSystemId, newName)) {
            newName = newName + " (Copia)";
            int counter = 1;
            while(tableRepository.existsBySystemIdAndName(targetSystemId, newName)) {
                newName = sourceTable.getName() + " (Copia " + counter + ")";
                counter++;
            }
        }
        
        // 1. Create Table
        SystemTable newTable = new SystemTable();
        newTable.setSystemId(targetSystemId);
        newTable.setName(newName);
        newTable.setDescription(sourceTable.getDescription());
        newTable = tableRepository.save(newTable);
        
        auditService.log(targetSystemId, userId, "Crear Tabla (Copia)", "Se copió la tabla '" + sourceTable.getName() + "' como '" + newName + "'", null);
        
        // 2. Copy Fields
        List<com.Datium.Datium.dto.SystemFieldResponse> sourceFields = systemDataService.getFieldsByTable(tableId, userId);
        java.util.Map<String, Integer> mapFieldNameToNewId = new java.util.HashMap<>();
        
        for (com.Datium.Datium.dto.SystemFieldResponse sf : sourceFields) {
            com.Datium.Datium.dto.SystemFieldRequest req = new com.Datium.Datium.dto.SystemFieldRequest();
            req.setName(sf.getName());
            req.setType(sf.getType());
            req.setRequired(sf.getRequired());
            req.setOrderIndex(sf.getOrderIndex());
            req.setOptions(sf.getOptions());
            
            if ("relation".equals(sf.getType())) {
                 req.setRelatedTableId(sf.getRelatedTableId());
            }

            try {
                com.Datium.Datium.dto.SystemFieldResponse newField = systemDataService.createFieldForTable(newTable.getId(), req, userId);
                mapFieldNameToNewId.put(newField.getName(), newField.getId());
            } catch (Exception e) {
                // Ignore
            }
        }
        
        // 3. Copy Records
        List<com.Datium.Datium.dto.SystemRecordResponse> sourceRecords = systemDataService.getRecordsByTable(tableId, userId);
        for (com.Datium.Datium.dto.SystemRecordResponse rec : sourceRecords) {
            com.Datium.Datium.dto.SystemRecordRequest recReq = new com.Datium.Datium.dto.SystemRecordRequest();
            java.util.Map<Integer, Object> valuesMap = new java.util.HashMap<>();
            
            for (java.util.Map.Entry<String, String> entry : rec.getFieldValues().entrySet()) {
                String fName = entry.getKey();
                String val = entry.getValue();
                
                if (mapFieldNameToNewId.containsKey(fName)) {
                    Integer newFId = mapFieldNameToNewId.get(fName);
                    valuesMap.put(newFId, val);
                }
            }
            recReq.setValues(valuesMap);
            try {
                systemDataService.createRecordForTable(newTable.getId(), recReq, userId);
            } catch(Exception e) {
            }
        }
    }

    @Autowired
    private com.Datium.Datium.repository.UserRepository userRepository;

    private void checkSystemAccess(Integer systemId, Integer userId, String errorMessage, boolean requireWrite) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (system.getOwnerId().equals(userId)) {
            return;
        }

        com.Datium.Datium.entity.User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            java.util.Optional<com.Datium.Datium.entity.SystemShare> share = 
                systemShareRepository.findBySystemIdAndUserEmail(systemId, user.getEmail());
            
            if (share.isPresent()) {
                if (!requireWrite) return; // READ access (VIEWER or EDITOR) is enough
                if ("EDITOR".equals(share.get().getPermissionLevel())) return;
            }
            
             java.util.Optional<com.Datium.Datium.entity.SystemUser> systemUser =
                systemUserRepository.findBySystemIdAndUserId(systemId, userId);

            if (systemUser.isPresent()) {
                com.Datium.Datium.entity.SystemUser.Role role = systemUser.get().getRole();
                if (role == com.Datium.Datium.entity.SystemUser.Role.admin || 
                    role == com.Datium.Datium.entity.SystemUser.Role.editor) {
                    return;
                }
                 // If role is viewer? Check logic. For now legacy used roles.
                 if (!requireWrite) return; 
            }
        }

        throw new RuntimeException(errorMessage);
    }
}
