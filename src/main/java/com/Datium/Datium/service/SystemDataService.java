package com.Datium.Datium.service;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.entity.*;
import com.Datium.Datium.repository.*;
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

    @Autowired
    private SystemUserRepository systemUserRepository;

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
}

