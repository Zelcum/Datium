package com.Datium.Datium.service;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.entity.*;
import com.Datium.Datium.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SystemDataService {

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private SystemFieldRepository systemFieldRepository;

    @Autowired
    private SystemFieldOptionRepository systemFieldOptionRepository;

    @Autowired
    private SystemRecordRepository systemRecordRepository;

    @Autowired
    private SystemRecordValueRepository systemRecordValueRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private SystemUserRepository systemUserRepository;

    @Autowired
    private SystemFieldLinkRepository systemFieldLinkRepository;

    @Autowired
    private SystemFieldTransferLogRepository systemFieldTransferLogRepository;

    private boolean hasPermission(Integer systemId, Integer userId, String action) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        if (system.getOwnerId().equals(userId)) {
            return true;
        }
        
        SystemUser systemUser = systemUserRepository.findBySystemIdAndUserId(systemId, userId)
            .orElse(null);
        
        if (systemUser == null) {
            return false;
        }
        
        SystemUser.Role role = systemUser.getRole();
        
        switch (action) {
            case "manage_fields":
                return role == SystemUser.Role.admin;
            case "create_record":
            case "update_record":
            case "delete_record":
                return role == SystemUser.Role.admin || role == SystemUser.Role.editor;
            case "view":
                return true;
            default:
                return false;
        }
    }

    public List<SystemFieldResponse> getFields(Integer systemId, Integer userId) {
        if (!hasPermission(systemId, userId, "view")) {
            throw new RuntimeException("No tienes permisos para ver los campos");
        }
        
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        return fields.stream().map(this::convertToFieldResponse).collect(Collectors.toList());
    }

    @Transactional
    public SystemFieldResponse createField(Integer systemId, SystemFieldRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para crear campos");
        }
        
        SystemField field = new SystemField();
        field.setSystemId(systemId);
        field.setName(request.getName());
        field.setType(request.getType());
        field.setRequired(request.getRequired() != null ? request.getRequired() : false);
        field.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        
        field = systemFieldRepository.save(field);
        
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            for (String optionValue : request.getOptions()) {
                SystemFieldOption option = new SystemFieldOption();
                option.setFieldId(field.getId());
                option.setValue(optionValue.trim());
                systemFieldOptionRepository.save(option);
            }
        }
        
        return convertToFieldResponse(field);
    }

    @Transactional
    public SystemFieldResponse updateField(Integer systemId, Integer fieldId, SystemFieldRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para actualizar campos");
        }
        
        SystemField field = systemFieldRepository.findById(fieldId)
            .orElseThrow(() -> new RuntimeException("Campo no encontrado"));
        
        if (!field.getSystemId().equals(systemId)) {
            throw new RuntimeException("El campo no pertenece a este sistema");
        }
        
        field.setName(request.getName());
        field.setType(request.getType());
        field.setRequired(request.getRequired() != null ? request.getRequired() : false);
        field.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        
        systemFieldOptionRepository.deleteByFieldId(fieldId);
        
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            for (String optionValue : request.getOptions()) {
                SystemFieldOption option = new SystemFieldOption();
                option.setFieldId(field.getId());
                option.setValue(optionValue.trim());
                systemFieldOptionRepository.save(option);
            }
        }
        
        field = systemFieldRepository.save(field);
        return convertToFieldResponse(field);
    }

    @Transactional
    public void deleteField(Integer systemId, Integer fieldId, Integer userId) {
        if (!hasPermission(systemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para eliminar campos");
        }
        
        SystemField field = systemFieldRepository.findById(fieldId)
            .orElseThrow(() -> new RuntimeException("Campo no encontrado"));
        
        if (!field.getSystemId().equals(systemId)) {
            throw new RuntimeException("El campo no pertenece a este sistema");
        }
        
        systemFieldOptionRepository.deleteByFieldId(fieldId);
        systemFieldRepository.delete(field);
    }

    public List<SystemRecordResponse> getRecords(Integer systemId, Integer userId) {
        if (!hasPermission(systemId, userId, "view")) {
            throw new RuntimeException("No tienes permisos para ver los registros");
        }
        
        List<SystemRecord> records = systemRecordRepository.findBySystemId(systemId);
        return records.stream().map(record -> convertToRecordResponse(record, systemId)).collect(Collectors.toList());
    }

    @Transactional
    public SystemRecordResponse createRecord(Integer systemId, SystemRecordRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "create_record")) {
            throw new RuntimeException("No tienes permisos para crear registros");
        }
        
        SystemRecord record = new SystemRecord();
        record.setSystemId(systemId);
        record.setCreatedBy(userId);
        record = systemRecordRepository.save(record);
        
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        Map<String, Integer> fieldNameToId = new HashMap<>();
        for (SystemField field : fields) {
            fieldNameToId.put(field.getName(), field.getId());
        }
        
        if (request.getFieldValues() != null) {
            for (Map.Entry<String, String> entry : request.getFieldValues().entrySet()) {
                Integer fieldId = fieldNameToId.get(entry.getKey());
                if (fieldId != null) {
                    SystemRecordValue value = new SystemRecordValue();
                    value.setRecordId(record.getId());
                    value.setFieldId(fieldId);
                    value.setValue(entry.getValue());
                    systemRecordValueRepository.save(value);
                }
            }
        }
        
        return convertToRecordResponse(record, systemId);
    }

    @Transactional
    public SystemRecordResponse updateRecord(Integer systemId, Integer recordId, SystemRecordRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "update_record")) {
            throw new RuntimeException("No tienes permisos para actualizar registros");
        }
        
        SystemRecord record = systemRecordRepository.findById(recordId)
            .orElseThrow(() -> new RuntimeException("Registro no encontrado"));
        
        if (!record.getSystemId().equals(systemId)) {
            throw new RuntimeException("El registro no pertenece a este sistema");
        }
        
        record = systemRecordRepository.save(record);
        
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        Map<String, Integer> fieldNameToId = new HashMap<>();
        for (SystemField field : fields) {
            fieldNameToId.put(field.getName(), field.getId());
        }
        
        systemRecordValueRepository.deleteByRecordId(recordId);
        entityManager.flush();
        entityManager.clear();
        
        if (request.getFieldValues() != null) {
            for (Map.Entry<String, String> entry : request.getFieldValues().entrySet()) {
                Integer fieldId = fieldNameToId.get(entry.getKey());
                if (fieldId != null && entry.getValue() != null) {
                    SystemRecordValue value = new SystemRecordValue();
                    value.setRecordId(record.getId());
                    value.setFieldId(fieldId);
                    value.setValue(entry.getValue());
                    systemRecordValueRepository.save(value);
                }
            }
        }
        
        return convertToRecordResponse(record, systemId);
    }

    @Transactional
    public void deleteRecord(Integer systemId, Integer recordId, Integer userId) {
        if (!hasPermission(systemId, userId, "delete_record")) {
            throw new RuntimeException("No tienes permisos para eliminar registros");
        }
        
        SystemRecord record = systemRecordRepository.findById(recordId)
            .orElseThrow(() -> new RuntimeException("Registro no encontrado"));
        
        if (!record.getSystemId().equals(systemId)) {
            throw new RuntimeException("El registro no pertenece a este sistema");
        }
        
        systemRecordValueRepository.deleteByRecordId(recordId);
        systemRecordRepository.delete(record);
    }

    private SystemFieldResponse convertToFieldResponse(SystemField field) {
        SystemFieldResponse response = new SystemFieldResponse();
        response.setId(field.getId());
        response.setName(field.getName());
        response.setType(field.getType());
        response.setRequired(field.getRequired());
        response.setOrderIndex(field.getOrderIndex());
        response.setCreatedAt(field.getCreatedAt());
        
        List<SystemFieldOption> options = systemFieldOptionRepository.findByFieldId(field.getId());
        response.setOptions(options.stream().map(SystemFieldOption::getValue).collect(Collectors.toList()));
        
        return response;
    }

    private SystemRecordResponse convertToRecordResponse(SystemRecord record, Integer systemId) {
        SystemRecordResponse response = new SystemRecordResponse();
        response.setId(record.getId());
        response.setCreatedAt(record.getCreatedAt());
        response.setUpdatedAt(record.getUpdatedAt());
        
        List<SystemRecordValue> values = systemRecordValueRepository.findByRecordId(record.getId());
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        
        Map<Integer, String> fieldIdToName = new HashMap<>();
        for (SystemField field : fields) {
            fieldIdToName.put(field.getId(), field.getName());
        }
        
        Map<String, String> fieldValues = new HashMap<>();
        for (SystemRecordValue value : values) {
            String fieldName = fieldIdToName.get(value.getFieldId());
            if (fieldName != null) {
                fieldValues.put(fieldName, value.getValue());
            }
        }
        
        response.setFieldValues(fieldValues);
        return response;
    }

    @Transactional
    public int transferFields(Integer sourceSystemId, List<Integer> fieldIds, Integer targetSystemId, Integer userId) {
        com.Datium.Datium.entity.System sourceSystem = systemRepository.findById(sourceSystemId)
            .orElseThrow(() -> new RuntimeException("Sistema origen no encontrado"));
        
        com.Datium.Datium.entity.System targetSystem = systemRepository.findById(targetSystemId)
            .orElseThrow(() -> new RuntimeException("Sistema destino no encontrado"));
        
        if (sourceSystemId.equals(targetSystemId)) {
            throw new RuntimeException("No puedes transferir campos al mismo sistema");
        }
        
        if (!hasPermission(sourceSystemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para transferir campos del sistema origen");
        }
        
        if (!hasPermission(targetSystemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para transferir campos al sistema destino");
        }
        
        int totalTransferredRecords = 0;
        
        for (Integer fieldId : fieldIds) {
            SystemField sourceField = systemFieldRepository.findById(fieldId)
                .orElseThrow(() -> new RuntimeException("Campo no encontrado: " + fieldId));
            
            if (!sourceField.getSystemId().equals(sourceSystemId)) {
                throw new RuntimeException("El campo no pertenece al sistema origen");
            }
            
            SystemField targetField = new SystemField();
            targetField.setSystemId(targetSystemId);
            targetField.setName(sourceField.getName());
            targetField.setType(sourceField.getType());
            targetField.setRequired(sourceField.getRequired());
            targetField.setOrderIndex(sourceField.getOrderIndex());
            targetField = systemFieldRepository.save(targetField);
            
            List<SystemFieldOption> sourceOptions = systemFieldOptionRepository.findByFieldId(sourceField.getId());
            for (SystemFieldOption sourceOption : sourceOptions) {
                SystemFieldOption targetOption = new SystemFieldOption();
                targetOption.setFieldId(targetField.getId());
                targetOption.setValue(sourceOption.getValue());
                systemFieldOptionRepository.save(targetOption);
            }
            
            List<SystemRecordValue> sourceFieldValues = systemRecordValueRepository.findByFieldId(sourceField.getId());
            Map<Integer, Integer> sourceRecordIdToTargetRecordId = new HashMap<>();
            int transferredRecordsForField = 0;
            
            for (SystemRecordValue sourceValue : sourceFieldValues) {
                SystemRecord sourceRecord = systemRecordRepository.findById(sourceValue.getRecordId())
                    .orElse(null);
                
                if (sourceRecord == null || !sourceRecord.getSystemId().equals(sourceSystemId)) {
                    continue;
                }
                
                Integer targetRecordId = sourceRecordIdToTargetRecordId.get(sourceRecord.getId());
                
                if (targetRecordId == null) {
                    SystemRecord targetRecord = new SystemRecord();
                    targetRecord.setSystemId(targetSystemId);
                    targetRecord.setCreatedBy(userId);
                    targetRecord = systemRecordRepository.save(targetRecord);
                    targetRecordId = targetRecord.getId();
                    sourceRecordIdToTargetRecordId.put(sourceRecord.getId(), targetRecordId);
                    transferredRecordsForField++;
                }
                
                SystemRecordValue targetValue = new SystemRecordValue();
                targetValue.setRecordId(targetRecordId);
                targetValue.setFieldId(targetField.getId());
                targetValue.setValue(sourceValue.getValue());
                systemRecordValueRepository.save(targetValue);
            }
            
            totalTransferredRecords += transferredRecordsForField;
            
            SystemFieldLink link = new SystemFieldLink();
            link.setSourceSystemId(sourceSystemId);
            link.setSourceFieldId(sourceField.getId());
            link.setTargetSystemId(targetSystemId);
            link.setTargetFieldId(targetField.getId());
            systemFieldLinkRepository.save(link);
            
            SystemFieldTransferLog log = new SystemFieldTransferLog();
            log.setSourceSystemId(sourceSystemId);
            log.setTargetSystemId(targetSystemId);
            log.setSourceFieldId(sourceField.getId());
            log.setTargetFieldId(targetField.getId());
            log.setTransferredRecords(transferredRecordsForField);
            systemFieldTransferLogRepository.save(log);
        }
        
        return totalTransferredRecords;
    }

    public List<Map<String, Object>> getAvailableFieldsToImport(Integer targetSystemId, Integer userId) {
        if (!hasPermission(targetSystemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para importar campos");
        }
        
        List<com.Datium.Datium.entity.System> allSystems = systemRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (com.Datium.Datium.entity.System system : allSystems) {
            if (system.getId().equals(targetSystemId)) {
                continue;
            }
            
            if (!hasPermission(system.getId(), userId, "view")) {
                continue;
            }
            
            List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(system.getId());
            if (fields.isEmpty()) {
                continue;
            }
            
            Map<String, Object> systemData = new HashMap<>();
            systemData.put("systemId", system.getId());
            systemData.put("systemName", system.getName());
            systemData.put("systemImageUrl", system.getImageUrl());
            
            List<Map<String, Object>> fieldsData = new ArrayList<>();
            for (SystemField field : fields) {
                Map<String, Object> fieldData = new HashMap<>();
                fieldData.put("id", field.getId());
                fieldData.put("name", field.getName());
                fieldData.put("type", field.getType());
                fieldData.put("required", field.getRequired());
                fieldData.put("orderIndex", field.getOrderIndex());
                
                List<SystemFieldOption> options = systemFieldOptionRepository.findByFieldId(field.getId());
                fieldData.put("options", options.stream().map(SystemFieldOption::getValue).collect(Collectors.toList()));
                
                fieldsData.add(fieldData);
            }
            
            systemData.put("fields", fieldsData);
            result.add(systemData);
        }
        
        return result;
    }

    @Transactional
    public int importFields(Integer targetSystemId, Integer sourceSystemId, List<Integer> fieldIds, Integer userId) {
        return transferFields(sourceSystemId, fieldIds, targetSystemId, userId);
    }
}

