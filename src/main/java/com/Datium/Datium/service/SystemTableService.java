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

    @Autowired
    private com.Datium.Datium.repository.SystemShareRepository systemShareRepository;

    @org.springframework.transaction.annotation.Transactional
    public void moveTable(Integer tableId, Integer targetSystemId, Integer userId) {
        SystemTable table = getTable(tableId);
        
        // Validate target system access
        checkSystemAccess(targetSystemId, userId, "No tienes permiso para modificar el sistema destino");
        
        // Validate source system access
        checkSystemAccess(table.getSystemId(), userId, "No tienes permiso para modificar el sistema origen");

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

    @Autowired
    private com.Datium.Datium.repository.UserRepository userRepository;

    private void checkSystemAccess(Integer systemId, Integer userId, String errorMessage) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (system.getOwnerId().equals(userId)) {
            return;
        }

        com.Datium.Datium.entity.User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            // Check SystemShare (by email)
            java.util.Optional<com.Datium.Datium.entity.SystemShare> share = 
                systemShareRepository.findBySystemIdAndUserEmail(systemId, user.getEmail());
            
            if (share.isPresent() && "EDITOR".equals(share.get().getPermissionLevel())) {
                return;
            }
            
            // Check SystemUser (by userId) - Legacy/Internal method
            // Need to inject SystemUserRepository
             java.util.Optional<com.Datium.Datium.entity.SystemUser> systemUser =
                systemUserRepository.findBySystemIdAndUserId(systemId, userId);

            if (systemUser.isPresent()) {
                com.Datium.Datium.entity.SystemUser.Role role = systemUser.get().getRole();
                if (role == com.Datium.Datium.entity.SystemUser.Role.admin || 
                    role == com.Datium.Datium.entity.SystemUser.Role.editor) {
                    return;
                }
            }
        }

        throw new RuntimeException(errorMessage);
    }

    @Autowired
    private com.Datium.Datium.repository.SystemUserRepository systemUserRepository;
}
