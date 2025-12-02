package com.Datium.Datium.service;

import com.Datium.Datium.dto.SystemRelationshipRequest;
import com.Datium.Datium.dto.SystemRelationshipResponse;
import com.Datium.Datium.entity.SystemField;
import com.Datium.Datium.entity.SystemRelationship;
import com.Datium.Datium.entity.SystemTable;
import com.Datium.Datium.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SystemRelationshipService {

    @Autowired
    private SystemRelationshipRepository systemRelationshipRepository;

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private SystemUserRepository systemUserRepository;

    @Autowired
    private SystemTableRepository systemTableRepository;

    @Autowired
    private SystemFieldRepository systemFieldRepository;

    private boolean hasPermission(Integer systemId, Integer userId) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
                .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));

        if (system.getOwnerId().equals(userId)) {
            return true;
        }

        return systemUserRepository.existsBySystemIdAndUserId(systemId, userId);
    }

    public List<SystemRelationshipResponse> getAllRelationships(Integer systemId, Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para ver las relaciones de este sistema");
        }

        List<SystemRelationship> relationships = systemRelationshipRepository.findBySystemIdOrderByIdAsc(systemId);
        return relationships.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    @Transactional
    public SystemRelationshipResponse createRelationship(Integer systemId, SystemRelationshipRequest request,
            Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para crear relaciones en este sistema");
        }

        SystemRelationship relationship = new SystemRelationship();
        relationship.setSystemId(systemId);
        relationship.setFromTableId(request.getFromTableId());
        relationship.setFromFieldId(request.getFromFieldId());
        relationship.setToTableId(request.getToTableId());
        relationship.setToFieldId(request.getToFieldId());

        try {
            relationship.setRelationType(SystemRelationship.RelationType.valueOf(request.getRelationType()));
        } catch (IllegalArgumentException e) {
            relationship.setRelationType(SystemRelationship.RelationType.many_to_many);
        }

        relationship = systemRelationshipRepository.save(relationship);
        return convertToResponse(relationship);
    }

    @Transactional
    public void deleteRelationship(Integer systemId, Integer relationshipId, Integer userId) {
        if (!hasPermission(systemId, userId)) {
            throw new RuntimeException("No tienes permisos para eliminar relaciones de este sistema");
        }

        SystemRelationship relationship = systemRelationshipRepository.findById(relationshipId)
                .orElseThrow(() -> new RuntimeException("Relación no encontrada"));

        if (!relationship.getSystemId().equals(systemId)) {
            throw new RuntimeException("La relación no pertenece a este sistema");
        }

        systemRelationshipRepository.delete(relationship);
    }

    private SystemRelationshipResponse convertToResponse(SystemRelationship relationship) {
        SystemRelationshipResponse response = new SystemRelationshipResponse();
        response.setId(relationship.getId());
        response.setSystemId(relationship.getSystemId());
        response.setFromTableId(relationship.getFromTableId());
        response.setFromFieldId(relationship.getFromFieldId());
        response.setToTableId(relationship.getToTableId());
        response.setToFieldId(relationship.getToFieldId());
        response.setRelationType(relationship.getRelationType().name());

        // Get table names
        SystemTable fromTable = systemTableRepository.findById(relationship.getFromTableId()).orElse(null);
        SystemTable toTable = systemTableRepository.findById(relationship.getToTableId()).orElse(null);

        if (fromTable != null) {
            response.setFromTableName(fromTable.getName());
        }
        if (toTable != null) {
            response.setToTableName(toTable.getName());
        }

        // Get field names
        SystemField fromField = systemFieldRepository.findById(relationship.getFromFieldId()).orElse(null);
        SystemField toField = systemFieldRepository.findById(relationship.getToFieldId()).orElse(null);

        if (fromField != null) {
            response.setFromFieldName(fromField.getName());
        }
        if (toField != null) {
            response.setToFieldName(toField.getName());
        }

        return response;
    }
}
