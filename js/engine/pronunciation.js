/**
 * ASU ROAR Pronunciation Dictionary & Narration Preprocessing Layer
 *
 * Enforces:
 *  - "ASU" -> spoken as three separate letters "A S U" (Ain Shams University), never "Asoo"
 *  - "ASU ROAR" -> spoken as "A S U Roar"
 *  - Natural robotics engineering pronunciation for ROS 2, IESKF, MPPI, ZUPT, Nav2, TF, QoS, D* Lite, etc.
 */
(function () {
  const PRONUNCIATION_DICTIONARY = [
    // Project name: ASU (Ain Shams University) must always be spelled out A-S-U
    { pattern: /\bA-S-U\s+ROAR\b/g, spoken: "A S U Roar", note: "Project name spoken letter-by-letter + Roar" },
    { pattern: /\bASU\s+ROAR\b/g, spoken: "A S U Roar", note: "Project name spoken letter-by-letter + Roar" },
    { pattern: /\bA-S-U\b/g, spoken: "A S U", note: "Ain Shams University initialism" },
    { pattern: /\bASU\b/g, spoken: "A S U", note: "Ain Shams University initialism" },
    { pattern: /\bROAR\b/g, spoken: "Roar", note: "Rover team name spoken as word" },
    { pattern: /\bERC\b/g, spoken: "E R C", note: "European Rover Challenge" },

    // Core robotics abbreviations
    { pattern: /\bROS\s*2\b/g, spoken: "Ross 2", note: "Robot Operating System 2" },
    { pattern: /\bROS\b/g, spoken: "Ross", note: "Robot Operating System" },
    { pattern: /\bNav2\b/g, spoken: "Nav 2", note: "Navigation2 stack" },
    { pattern: /\bIESKF\b/g, spoken: "I E S K F", note: "Iterated Error-State Kalman Filter" },
    { pattern: /\bMPPI\b/g, spoken: "M P P I", note: "Model Predictive Path Integral" },
    { pattern: /\bZUPT\b/g, spoken: "Z U P T", note: "Zero-Velocity Update" },
    { pattern: /\bTF2\b/g, spoken: "T F 2", note: "Transform library v2" },
    { pattern: /\bTF\b/g, spoken: "T F", note: "Coordinate transform tree" },
    { pattern: /\bQoS\b/g, spoken: "Q O S", note: "Quality of Service" },
    { pattern: /D\*\s*Lite/g, spoken: "D-star Lite", note: "Incremental graph planner" },
    { pattern: /\bA\*/g, spoken: "A-star", note: "Graph search" },

    // Hardware, SLAM, Perception & Control abbreviations
    { pattern: /\bWIO\b/g, spoken: "W I O", note: "Wheel-Inertial Odometry" },
    { pattern: /\bWVO\b/g, spoken: "W V O", note: "Wheel-Visual Odometry" },
    { pattern: /\bWO-FIS\b/g, spoken: "W O F I S", note: "Wheel Odometry Fuzzy Inference System" },
    { pattern: /\bVO-FIS\b/g, spoken: "V O F I S", note: "Visual Odometry Fuzzy Inference System" },
    { pattern: /\bFIS\b/g, spoken: "F I S", note: "Fuzzy Inference System" },
    { pattern: /\bIMU\b/g, spoken: "I M U", note: "Inertial Measurement Unit" },
    { pattern: /\bBNO055\b/g, spoken: "B N O zero five five", note: "Bosch 9-axis IMU" },
    { pattern: /\bZED2i\b/g, spoken: "Zed 2 i", note: "Stereolabs stereo camera" },
    { pattern: /\bXYZRGB\b/g, spoken: "X Y Z R G B", note: "Colored 3D point format" },
    { pattern: /\bRGB-D\b/g, spoken: "R G B D", note: "Color plus depth" },
    { pattern: /\bRGB\b/g, spoken: "R G B", note: "Color image" },
    { pattern: /\bURDF\b/g, spoken: "U R D F", note: "Unified Robot Description Format" },
    { pattern: /\b[Xx]acro\b/g, spoken: "zack-roh", note: "XML macro processor" },
    { pattern: /\bSDF\b/g, spoken: "S D F", note: "Simulation Description Format" },
    { pattern: /\bSOR\b/g, spoken: "S O R", note: "Statistical Outlier Removal" },
    { pattern: /\bROR\b/g, spoken: "R O R", note: "Radius Outlier Removal" },
    { pattern: /\bROI\b/g, spoken: "R O I", note: "Region of Interest" },
    { pattern: /\bPCA\b/g, spoken: "P C A", note: "Principal Component Analysis" },
    { pattern: /\bRANSAC\b/g, spoken: "ran-sack", note: "Random Sample Consensus" },
    { pattern: /\bDBSCAN\b/g, spoken: "D B scan", note: "Density-Based Spatial Clustering" },
    { pattern: /\bEMA\b/g, spoken: "E M A", note: "Exponential Moving Average" },
    { pattern: /\bArUco\b/g, spoken: "ah-roo-koh", note: "Fiducial marker library" },
    { pattern: /\bSolvePnP\b/g, spoken: "Solve P N P", note: "Perspective-n-Point solver" },
    { pattern: /\bIPPE\b/g, spoken: "I P P E", note: "Infinitesimal Plane-Based Pose Estimation" },
    { pattern: /\b6-DOF\b/g, spoken: "six D O F", note: "Six degrees of freedom" },
    { pattern: /\b12D\b/g, spoken: "twelve D", note: "Twelve-dimensional state" },
    { pattern: /\b2\.5D\b/g, spoken: "two point five D", note: "Elevation map representation" },
    { pattern: /\b3D\b/g, spoken: "three D", note: "Three-dimensional" },
    { pattern: /\bBFS\b/g, spoken: "B F S", note: "Breadth-First Search" },
    { pattern: /\bCUDA\b/g, spoken: "koo-dah", note: "NVIDIA GPU compute" },
    { pattern: /\bGPU\b/g, spoken: "G P U", note: "Graphics Processing Unit" },
    { pattern: /\bIoU\b/g, spoken: "I O U", note: "Intersection over Union" },
    { pattern: /\bSLAM\b/g, spoken: "slam", note: "Simultaneous Localization and Mapping" },
    { pattern: /\bBT\b/g, spoken: "B T", note: "Behavior Tree" },
    { pattern: /\bGUI\b/g, spoken: "G U I", note: "Graphical User Interface" },
    { pattern: /\bHTML\b/g, spoken: "H T M L", note: "HyperText Markup Language" },
    { pattern: /\bYAML\b/g, spoken: "yam-ul", note: "Configuration format" },
    { pattern: /\bJSON\b/g, spoken: "jay-son", note: "Data interchange format" },
    { pattern: /\bNumPy\b/g, spoken: "num-pie", note: "Python numerical array package" },
    { pattern: /\bPyQt5\b/g, spoken: "Pie Q T five", note: "Python Qt5 GUI toolkit" },
    { pattern: /\bOpen3D\b/g, spoken: "Open three D", note: "3D point cloud library" },
    { pattern: /\bOpenCV\b/g, spoken: "Open C V", note: "Computer vision library" },
    { pattern: /\bFastDDS\b/g, spoken: "Fast D D S", note: "ROS 2 DDS middleware" },
    { pattern: /\bRViz2\b/g, spoken: "R-viz two", note: "ROS 2 3D visualizer" },
    { pattern: /\bRViz\b/g, spoken: "R-viz", note: "ROS 3D visualizer" },
    { pattern: /\bSIGINT\b/g, spoken: "sig-int", note: "POSIX interrupt signal" },
    { pattern: /\bRMSE\b/g, spoken: "R M S E", note: "Root Mean Square Error" },
    { pattern: /\bXY\b/g, spoken: "X Y", note: "Planar coordinates" },
    { pattern: /\bL2\b/g, spoken: "L two", note: "Euclidean norm" },
    { pattern: /\bk_Q\b/g, spoken: "k Q", note: "Process noise scaling factor" },
    { pattern: /\bk_V\b/g, spoken: "k V", note: "Visual observation noise scaling factor" },
    { pattern: /\bd_edge\b/g, spoken: "d edge", note: "Rover chassis edge distance" },
    { pattern: /Z²/g, spoken: "Z squared", note: "Quadratic depth term" },
    { pattern: /\bHz\b/g, spoken: "hertz", note: "Frequency unit" },
    { pattern: /\bm\/s\b/g, spoken: "meters per second", note: "Velocity unit" }
  ];

  function preprocess(rawText) {
    let out = String(rawText || "");
    for (const rule of PRONUNCIATION_DICTIONARY) {
      out = out.replace(rule.pattern, rule.spoken);
    }
    return out.replace(/\s{2,}/g, " ").trim();
  }

  function hasArabic(text) {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(text || ""));
  }

  window.RoarPronunciation = {
    DICTIONARY: PRONUNCIATION_DICTIONARY,
    preprocess,
    hasArabic
  };
})();
