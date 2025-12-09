package com.Datium.Datium.service;

import com.Datium.Datium.dto.SystemRelationshipRequest;
import com.Datium.Datium.dto.SystemRelationshipResponse;
import com.Datium.Datium.entity.SystemRelationship;
import com.Datium.Datium.repository.SystemRelationshipRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SystemRelationshipService {

    @Autowired
    private SystemRelationshipRepository systemRelationshipRepository;

    public List<SystemRelationshipResponse> getAllRelationships(Integer systemId, Integer userId) {
        List<SystemRelationship> relationships = systemRelationshipRepository.findBySystemId(systemId);
        return relationships.stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    public SystemRelationshipResponse createRelationship(Integer systemId, SystemRelationshipRequest request, Integer userId) {
        SystemRelationship relationship = new SystemRelationship();
        relationship.setSystemId(systemId);
        relationship.setFromTableId(request.getFromTableId());
        relationship.setFromFieldId(request.getFromFieldId());
        relationship.setToTableId(request.getToTableId());
        relationship.setToFieldId(request.getToFieldId());
        relationship.setType(SystemRelationship.RelationshipType.valueOf(request.getType()));

        relationship = systemRelationshipRepository.save(relationship);
        return convertToResponse(relationship);
    }

    public void deleteRelationship(Integer systemId, Integer relationshipId, Integer userId) {
        SystemRelationship relationship = systemRelationshipRepository.findById(relationshipId)
                .orElseThrow(() -> new RuntimeException("Relationship not found"));
        
        if (!relationship.getSystemId().equals(systemId)) {
            throw new RuntimeException("Relationship does not belong to this system");
        }
        
        systemRelationshipRepository.delete(relationship);
    }

    private SystemRelationshipResponse convertToResponse(SystemRelationship relationship) {
        SystemRelationshipResponse response = new SystemRelationshipResponse();
        response.setId(relationship.getId());
        response.setFromTableId(relationship.getFromTableId());
        response.setFromFieldId(relationship.getFromFieldId());
        response.setToTableId(relationship.getToTableId());
        response.setToFieldId(relationship.getToFieldId());
        response.setType(relationship.getType().name());
        return response;
    }
}
