#!/usr/bin/env python3
"""
URDF Generator for AiNex Humanoid Robot
Generates a URDF model from robot specifications
"""

import xml.etree.ElementTree as ET
import xml.dom.minidom as minidom
import os
import sys
from typing import Dict, List, Tuple

# Robot specifications
ROBOT_NAME = "ainex_humanoid"

# Link dimensions (meters)
LINK_DIMS = {
    # Head
    "head_base": (0.08, 0.10, 0.06),
    "head_yaw_link": (0.08, 0.10, 0.08),
    
    # Torso
    "base_link": (0.15, 0.20, 0.30),
    
    # Arms
    "shoulder": (0.06, 0.08, 0.06),
    "upper_arm": (0.05, 0.05, 0.20),
    "forearm": (0.04, 0.04, 0.18),
    "wrist": (0.04, 0.04, 0.06),
    "gripper": (0.03, 0.08, 0.10),
    
    # Legs
    "hip": (0.08, 0.10, 0.08),
    "thigh": (0.08, 0.08, 0.25),
    "shin": (0.06, 0.06, 0.25),
    "ankle": (0.06, 0.08, 0.06),
    "foot": (0.10, 0.15, 0.03),
}

# Joint limits (radians)
JOINT_LIMITS = {
    # Head
    "head_yaw": (-1.57, 1.57),
    "head_pitch": (-0.785, 0.785),
    
    # Arms
    "shoulder_pitch": (-3.14, 3.14),
    "shoulder_roll": (-1.57, 0.5),  # Left arm
    "elbow_pitch": (-2.0, 0),
    "wrist_yaw": (-1.57, 1.57),
    "wrist_pitch": (-1.57, 1.57),
    "gripper": (0, 1.0),
    
    # Legs
    "hip_yaw": (-0.785, 0.785),
    "hip_roll": (-0.5, 0.5),
    "hip_pitch": (-1.57, 1.57),
    "knee_pitch": (0, 2.0),
    "ankle_pitch": (-0.785, 0.785),
    "ankle_roll": (-0.5, 0.5),
}

# Material colors
MATERIALS = {
    "black": (0.1, 0.1, 0.1, 1.0),
    "white": (0.9, 0.9, 0.9, 1.0),
    "grey": (0.5, 0.5, 0.5, 1.0),
    "blue": (0.2, 0.3, 0.8, 1.0),
    "red": (0.8, 0.2, 0.2, 1.0),
}


def create_material(name: str, color: Tuple[float, float, float, float]) -> ET.Element:
    """Create a material element"""
    material = ET.Element("material", name=name)
    rgba = ET.SubElement(material, "color", rgba=f"{color[0]} {color[1]} {color[2]} {color[3]}")
    return material


def create_box_visual(size: Tuple[float, float, float], material: str) -> ET.Element:
    """Create a box visual element"""
    visual = ET.Element("visual")
    geometry = ET.SubElement(visual, "geometry")
    box = ET.SubElement(geometry, "box", size=f"{size[0]} {size[1]} {size[2]}")
    mat = ET.SubElement(visual, "material", name=material)
    return visual


def create_box_collision(size: Tuple[float, float, float]) -> ET.Element:
    """Create a box collision element"""
    collision = ET.Element("collision")
    geometry = ET.SubElement(collision, "geometry")
    box = ET.SubElement(geometry, "box", size=f"{size[0]} {size[1]} {size[2]}")
    return collision


def create_inertial(mass: float, size: Tuple[float, float, float]) -> ET.Element:
    """Create an inertial element for a box"""
    inertial = ET.Element("inertial")
    mass_elem = ET.SubElement(inertial, "mass", value=str(mass))
    
    # Calculate inertia for a box
    ixx = mass * (size[1]**2 + size[2]**2) / 12.0
    iyy = mass * (size[0]**2 + size[2]**2) / 12.0
    izz = mass * (size[0]**2 + size[1]**2) / 12.0
    
    inertia = ET.SubElement(inertial, "inertia",
                          ixx=str(ixx), ixy="0", ixz="0",
                          iyy=str(iyy), iyz="0", izz=str(izz))
    return inertial


def create_link(name: str, size: Tuple[float, float, float], mass: float, material: str) -> ET.Element:
    """Create a link element"""
    link = ET.Element("link", name=name)
    link.append(create_box_visual(size, material))
    link.append(create_box_collision(size))
    link.append(create_inertial(mass, size))
    return link


def create_joint(name: str, parent: str, child: str, joint_type: str, 
                origin_xyz: str, origin_rpy: str, axis: str = "0 0 1",
                limits: Tuple[float, float] = None) -> ET.Element:
    """Create a joint element"""
    joint = ET.Element("joint", name=name, type=joint_type)
    ET.SubElement(joint, "parent", link=parent)
    ET.SubElement(joint, "child", link=child)
    ET.SubElement(joint, "origin", xyz=origin_xyz, rpy=origin_rpy)
    
    if joint_type == "revolute" and limits:
        ET.SubElement(joint, "axis", xyz=axis)
        ET.SubElement(joint, "limit", 
                     lower=str(limits[0]), upper=str(limits[1]),
                     effort="100", velocity="2.0")
        ET.SubElement(joint, "dynamics", damping="0.1", friction="0.1")
    
    return joint


def generate_urdf():
    """Generate the complete URDF model"""
    # Create root element
    robot = ET.Element("robot", name=ROBOT_NAME)
    
    # Add materials
    for name, color in MATERIALS.items():
        robot.append(create_material(name, color))
    
    # Base link (torso)
    base_link = create_link("base_link", LINK_DIMS["base_link"], 5.0, "grey")
    robot.append(base_link)
    
    # Head
    # Head base
    robot.append(create_joint("head_base_joint", "base_link", "head_base",
                            "fixed", "0 0 0.2", "0 0 0"))
    robot.append(create_link("head_base", LINK_DIMS["head_base"], 0.5, "grey"))
    
    # Head yaw
    robot.append(create_joint("head_yaw", "head_base", "head_yaw_link",
                            "revolute", "0 0 0.05", "0 0 0", "0 0 1",
                            JOINT_LIMITS["head_yaw"]))
    robot.append(create_link("head_yaw_link", LINK_DIMS["head_yaw_link"], 0.8, "white"))
    
    # Head pitch
    robot.append(create_joint("head_pitch", "head_yaw_link", "head_pitch_link",
                            "revolute", "0 0 0.06", "0 0 0", "0 1 0",
                            JOINT_LIMITS["head_pitch"]))
    robot.append(create_link("head_pitch_link", (0.08, 0.10, 0.10), 0.5, "black"))
    
    # Arms (left and right)
    for side in ["left", "right"]:
        sign = 1 if side == "left" else -1
        
        # Shoulder
        robot.append(create_joint(f"{side}_shoulder_joint", "base_link", f"{side}_shoulder",
                                "fixed", f"{sign*0.12} 0 0.1", "0 0 0"))
        robot.append(create_link(f"{side}_shoulder", LINK_DIMS["shoulder"], 0.5, "grey"))
        
        # Shoulder pitch
        robot.append(create_joint(f"{side}_shoulder_pitch", f"{side}_shoulder", f"{side}_upper_arm",
                                "revolute", f"{sign*0.05} 0 0", "0 0 0", "0 1 0",
                                JOINT_LIMITS["shoulder_pitch"]))
        robot.append(create_link(f"{side}_upper_arm", LINK_DIMS["upper_arm"], 1.0, "white"))
        
        # Shoulder roll
        roll_limits = JOINT_LIMITS["shoulder_roll"] if side == "left" else (-0.5, 1.57)
        robot.append(create_joint(f"{side}_shoulder_roll", f"{side}_upper_arm", f"{side}_upper_arm_roll",
                                "revolute", "0 0 0", "0 0 0", "1 0 0",
                                roll_limits))
        robot.append(create_link(f"{side}_upper_arm_roll", (0.05, 0.05, 0.01), 0.1, "grey"))
        
        # Elbow
        robot.append(create_joint(f"{side}_elbow_pitch", f"{side}_upper_arm_roll", f"{side}_forearm",
                                "revolute", "0 0 -0.2", "0 0 0", "0 1 0",
                                JOINT_LIMITS["elbow_pitch"]))
        robot.append(create_link(f"{side}_forearm", LINK_DIMS["forearm"], 0.8, "white"))
        
        # Wrist yaw
        robot.append(create_joint(f"{side}_wrist_yaw", f"{side}_forearm", f"{side}_wrist",
                                "revolute", "0 0 -0.18", "0 0 0", "0 0 1",
                                JOINT_LIMITS["wrist_yaw"]))
        robot.append(create_link(f"{side}_wrist", LINK_DIMS["wrist"], 0.3, "grey"))
        
        # Wrist pitch
        robot.append(create_joint(f"{side}_wrist_pitch", f"{side}_wrist", f"{side}_hand",
                                "revolute", "0 0 -0.03", "0 0 0", "0 1 0",
                                JOINT_LIMITS["wrist_pitch"]))
        robot.append(create_link(f"{side}_hand", (0.04, 0.08, 0.08), 0.2, "black"))
        
        # Gripper
        robot.append(create_joint(f"{side}_gripper", f"{side}_hand", f"{side}_gripper_link",
                                "revolute", "0 0 -0.05", "0 0 0", "0 1 0",
                                JOINT_LIMITS["gripper"]))
        robot.append(create_link(f"{side}_gripper_link", LINK_DIMS["gripper"], 0.1, "blue"))
    
    # Legs (left and right)
    for side in ["left", "right"]:
        sign = 1 if side == "left" else -1
        
        # Hip
        robot.append(create_joint(f"{side}_hip_joint", "base_link", f"{side}_hip",
                                "fixed", f"{sign*0.06} 0 -0.2", "0 0 0"))
        robot.append(create_link(f"{side}_hip", LINK_DIMS["hip"], 0.8, "grey"))
        
        # Hip yaw
        robot.append(create_joint(f"{side}_hip_yaw", f"{side}_hip", f"{side}_hip_yaw_link",
                                "revolute", "0 0 0", "0 0 0", "0 0 1",
                                JOINT_LIMITS["hip_yaw"]))
        robot.append(create_link(f"{side}_hip_yaw_link", (0.08, 0.08, 0.05), 0.3, "grey"))
        
        # Hip roll
        robot.append(create_joint(f"{side}_hip_roll", f"{side}_hip_yaw_link", f"{side}_hip_roll_link",
                                "revolute", "0 0 0", "0 0 0", "1 0 0",
                                JOINT_LIMITS["hip_roll"]))
        robot.append(create_link(f"{side}_hip_roll_link", (0.08, 0.08, 0.05), 0.3, "grey"))
        
        # Hip pitch
        robot.append(create_joint(f"{side}_hip_pitch", f"{side}_hip_roll_link", f"{side}_thigh",
                                "revolute", "0 0 -0.05", "0 0 0", "0 1 0",
                                JOINT_LIMITS["hip_pitch"]))
        robot.append(create_link(f"{side}_thigh", LINK_DIMS["thigh"], 2.0, "white"))
        
        # Knee
        robot.append(create_joint(f"{side}_knee_pitch", f"{side}_thigh", f"{side}_shin",
                                "revolute", "0 0 -0.25", "0 0 0", "0 1 0",
                                JOINT_LIMITS["knee_pitch"]))
        robot.append(create_link(f"{side}_shin", LINK_DIMS["shin"], 1.5, "white"))
        
        # Ankle pitch
        robot.append(create_joint(f"{side}_ankle_pitch", f"{side}_shin", f"{side}_ankle",
                                "revolute", "0 0 -0.25", "0 0 0", "0 1 0",
                                JOINT_LIMITS["ankle_pitch"]))
        robot.append(create_link(f"{side}_ankle", LINK_DIMS["ankle"], 0.3, "grey"))
        
        # Ankle roll
        robot.append(create_joint(f"{side}_ankle_roll", f"{side}_ankle", f"{side}_foot",
                                "revolute", "0 0 -0.03", "0 0 0", "1 0 0",
                                JOINT_LIMITS["ankle_roll"]))
        robot.append(create_link(f"{side}_foot", LINK_DIMS["foot"], 0.5, "black"))
    
    # Add Gazebo-specific elements
    gazebo_plugin = ET.Element("gazebo")
    plugin = ET.SubElement(gazebo_plugin, "plugin",
                          filename="libgazebo_ros2_control.so",
                          name="gazebo_ros2_control")
    ET.SubElement(plugin, "robot_sim_type").text = "gazebo_ros2_control/GazeboSystem"
    ET.SubElement(plugin, "parameters").text = "$(find ainex_control)/config/ainex_controllers.yaml"
    robot.append(gazebo_plugin)
    
    # Convert to pretty XML
    rough_string = ET.tostring(robot, encoding='unicode')
    reparsed = minidom.parseString(rough_string)
    pretty_xml = reparsed.toprettyxml(indent="  ")
    
    # Remove extra blank lines
    lines = pretty_xml.split('\n')
    lines = [line for line in lines if line.strip()]
    pretty_xml = '\n'.join(lines[1:])  # Skip XML declaration
    
    # Add XML declaration with proper formatting
    final_xml = '<?xml version="1.0"?>\n' + pretty_xml
    
    return final_xml


def main():
    """Main function"""
    # Generate URDF
    urdf_content = generate_urdf()
    
    # Create output directory
    output_dir = os.path.join(os.path.dirname(__file__), "..", "urdf")
    os.makedirs(output_dir, exist_ok=True)
    
    # Write URDF file
    output_file = os.path.join(output_dir, f"{ROBOT_NAME}.urdf")
    with open(output_file, 'w') as f:
        f.write(urdf_content)
    
    print(f"Generated URDF model: {output_file}")
    
    # Validate URDF if check_urdf is available
    try:
        import subprocess
        result = subprocess.run(['check_urdf', output_file], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("URDF validation: PASSED")
        else:
            print("URDF validation: FAILED")
            print(result.stderr)
    except FileNotFoundError:
        print("Note: 'check_urdf' not found. Install with: sudo apt-get install liburdfdom-tools")


if __name__ == "__main__":
    main() 